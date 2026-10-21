import type { Config } from './config';

const REQUEST_TIMEOUT_MS = 60_000;

export type ApiFailure = 'timeout' | 'cancelled' | 'http' | 'invalid-response' | 'empty-response' | 'network';

export class ApiError extends Error {
  constructor(readonly kind: ApiFailure, readonly detail: string) {
    super(detail);
    this.name = 'ApiError';
  }
}

export interface GenerateOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

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

// 保留 baseUrl 上已有的路径（和查询串，Azure 这类需要 ?api-version= 的网关要用），
// 只补上 /chat/completions。
function buildEndpoint(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/chat/completions`;
  return url.toString();
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

function toTransportError(err: unknown, timeoutSignal: AbortSignal): ApiError {
  if (timeoutSignal.aborted) {
    return new ApiError('timeout', 'request timed out');
  }
  if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
    return new ApiError('cancelled', 'request cancelled');
  }

  // Node 的 fetch 只报 “fetch failed”，真正原因在 cause 里（如 ECONNREFUSED）
  const cause = err instanceof Error ? (err as { cause?: unknown }).cause : undefined;
  const detail = cause instanceof Error ? `${err instanceof Error ? err.message : ''}: ${cause.message}` : toMessage(err);
  return new ApiError('network', detail);
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function generateCommitMessage(diff: string, cfg: Config, options: GenerateOptions = {}): Promise<string> {
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;

  const postData = JSON.stringify({
    model: cfg.model,
    messages: [
      { role: 'system', content: buildSystemPrompt(cfg) },
      { role: 'user', content: `Generate a commit message for the following diff:\n\n${diff}` },
    ],
    temperature: 0.3,
  });

  let response: Response;
  try {
    response = await fetch(buildEndpoint(cfg.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`,
      },
      body: postData,
      signal,
    });
  } catch (err) {
    throw toTransportError(err, timeoutSignal);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const suffix = body.trim() ? ` - ${body.trim().slice(0, 300)}` : '';
    throw new ApiError('http', `HTTP ${response.status} ${response.statusText}${suffix}`);
  }

  let payload: ChatCompletionResponse;
  try {
    payload = (await response.json()) as ChatCompletionResponse;
  } catch {
    throw new ApiError('invalid-response', 'response body is not valid JSON');
  }

  if (payload.error?.message) {
    throw new ApiError('http', payload.error.message);
  }

  const message = readContent(payload);
  if (!message) {
    throw new ApiError('empty-response', 'no message content in response');
  }
  return message;
}
