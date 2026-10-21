import type { Config } from './config';

const REQUEST_TIMEOUT_MS = 60_000;

export type ApiFailure = 'timeout' | 'cancelled' | 'http' | 'invalid-response' | 'empty-response' | 'network';

export class ApiError extends Error {
  constructor(readonly kind: ApiFailure, readonly detail: string, readonly status?: number) {
    super(detail);
    this.name = 'ApiError';
  }
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export type ApiCredentials = Pick<Config, 'baseUrl' | 'apiKey'>;
export type ApiTarget = ApiCredentials & Pick<Config, 'model'>;

interface ChatMessageContentPart {
  type?: string;
  text?: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | ChatMessageContentPart[];
    };
  }>;
  error?: {
    message?: string;
  };
}

interface ModelListResponse {
  data?: Array<{ id?: string }>;
}

function buildSystemPrompt(cfg: Config): string {
  const stylePrompts: Record<string, string> = {
    conventional: `You are a commit message generator. Generate a concise commit message following the Conventional Commits specification.
Format: <type>(<scope>): <description>
Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build.
Keep the description under 72 characters. Only output the commit message, no explanation.`,
    simple: `You are a commit message generator. Generate a very short and simple commit message summarizing the changes in one sentence. Only output the commit message, no explanation.`,
    detailed: `You are a commit message generator. Generate a commit message with a short summary line (under 72 chars) followed by a blank line and a more detailed explanation of the changes. Only output the commit message, no explanation.`,
  };

  let prompt = stylePrompts[cfg.style] || stylePrompts.conventional;
  prompt += `\nRespond in ${cfg.language}.`;
  if (cfg.customPrompt) {
    prompt += '\n' + cfg.customPrompt;
  }
  return prompt;
}

// 保留 baseUrl 上已有的路径（和查询串，Azure 这类需要 ?api-version= 的网关要用），只补后缀
function buildEndpoint(baseUrl: string, suffix: string): string {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/${suffix}`;
  return url.toString();
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function toTransportError(err: unknown, timeoutSignal: AbortSignal): ApiError {
  if (timeoutSignal.aborted) {
    return new ApiError('timeout', 'request timed out');
  }
  if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
    return new ApiError('cancelled', 'request cancelled');
  }

  // Node 的 fetch 只报 “fetch failed”，真正原因在 cause 里（如 ECONNREFUSED）
  const cause = err instanceof Error ? (err as { cause?: unknown }).cause : undefined;
  const detail = cause instanceof Error ? `${toMessage(err)}: ${cause.message}` : toMessage(err);
  return new ApiError('network', detail);
}

async function requestJson(
  credentials: ApiCredentials,
  suffix: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
  options: RequestOptions
): Promise<unknown> {
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;

  const headers: Record<string, string> = { Authorization: `Bearer ${credentials.apiKey}` };
  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(buildEndpoint(credentials.baseUrl, suffix), {
      method: init.method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal,
    });
  } catch (err) {
    throw toTransportError(err, timeoutSignal);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const suffixText = body.trim() ? ` - ${body.trim().slice(0, 300)}` : '';
    throw new ApiError('http', `HTTP ${response.status} ${response.statusText}${suffixText}`, response.status);
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new ApiError('invalid-response', 'response body is not valid JSON');
  }
}

function readContent(payload: ChatCompletionResponse): string {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('').trim();
  }
  return '';
}

export async function generateCommitMessage(diff: string, cfg: Config, options: RequestOptions = {}): Promise<string> {
  const payload = (await requestJson(
    cfg,
    'chat/completions',
    {
      method: 'POST',
      body: {
        model: cfg.model,
        messages: [
          { role: 'system', content: buildSystemPrompt(cfg) },
          { role: 'user', content: `Generate a commit message for the following diff:\n\n${diff}` },
        ],
        temperature: 0.3,
      },
    },
    options
  )) as ChatCompletionResponse;

  if (payload.error?.message) {
    throw new ApiError('http', payload.error.message);
  }

  const message = readContent(payload);
  if (!message) {
    throw new ApiError('empty-response', 'no message content in response');
  }
  return message;
}

export async function listModels(credentials: ApiCredentials, options: RequestOptions = {}): Promise<string[]> {
  const payload = (await requestJson(credentials, 'models', { method: 'GET' }, options)) as ModelListResponse;
  const models = (payload.data ?? [])
    .map((item) => item?.id)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    .map((id) => id.trim());

  if (models.length === 0) {
    throw new ApiError('empty-response', 'the service returned no models');
  }
  return Array.from(new Set(models)).sort((left, right) => left.localeCompare(right));
}

export interface ProbeResult {
  elapsedMs: number;
  models: string[];
  viaModelsApi: boolean;
}

// 连接测试优先用 /models（顺便拿到模型列表）；网关不实现该接口时退回一次最小 chat 请求
export async function probeConnection(target: ApiTarget, options: RequestOptions = {}): Promise<ProbeResult> {
  const startedAt = Date.now();

  try {
    const models = await listModels(target, options);
    return { elapsedMs: Date.now() - startedAt, models, viaModelsApi: true };
  } catch (err) {
    const unsupported =
      err instanceof ApiError && err.kind === 'http' && [400, 404, 405].includes(err.status ?? 0);
    if (!unsupported) {
      throw err;
    }
  }

  await requestJson(
    target,
    'chat/completions',
    {
      method: 'POST',
      body: {
        model: target.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      },
    },
    options
  );
  return { elapsedMs: Date.now() - startedAt, models: [], viaModelsApi: false };
}
