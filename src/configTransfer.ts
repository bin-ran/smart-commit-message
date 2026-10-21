import { checkBaseUrl } from './url';
import type { ProviderConfigMap } from './providers';

export const TRANSFER_VERSION = 1;
export const STYLE_VALUES = ['conventional', 'simple', 'detailed'] as const;
export const LANGUAGE_VALUES = ['', 'Chinese', 'English'] as const;
export const MIN_MAX_DIFF_CHARS = 100;

export interface TransferSettings {
  baseUrl: string;
  model: string;
  style: string;
  language: string;
  maxDiffChars: number;
  customPrompt: string;
}

export interface TransferFile {
  version: number;
  exportedAt?: string;
  settings: TransferSettings;
  // 槽位 -> 该服务商保存的 baseUrl/model
  providers?: ProviderConfigMap;
  // 生成时使用的服务商槽位
  defaultProvider?: string;
  // 槽位 -> Key。默认不导出，只有用户显式选择时才写入
  apiKeys?: Record<string, string>;
}

export interface TransferInput {
  settings: TransferSettings;
  providers?: ProviderConfigMap;
  defaultProvider?: string;
  apiKeys?: Record<string, string>;
}

export type TransferError =
  | 'invalid-json'
  | 'unsupported-version'
  | 'invalid-settings'
  | 'invalid-base-url'
  | 'insecure-base-url'
  | 'invalid-model'
  | 'invalid-style'
  | 'invalid-language'
  | 'invalid-max-diff-chars'
  | 'invalid-api-keys'
  | 'invalid-providers';

export type TransferParseResult = { file: TransferFile } | { error: TransferError };

export function buildTransferFile(input: TransferInput): TransferFile {
  const { settings, apiKeys, providers, defaultProvider } = input;
  const file: TransferFile = {
    version: TRANSFER_VERSION,
    exportedAt: new Date().toISOString(),
    settings: {
      baseUrl: settings.baseUrl,
      model: settings.model,
      style: settings.style,
      language: settings.language,
      maxDiffChars: settings.maxDiffChars,
      customPrompt: settings.customPrompt,
    },
  };

  const providerSlots = Object.keys(providers ?? {});
  if (providerSlots.length > 0) {
    const saved: ProviderConfigMap = {};
    for (const slot of providerSlots) {
      const entry = providers?.[slot];
      if (entry) {
        saved[slot] = { baseUrl: entry.baseUrl, model: entry.model };
      }
    }
    file.providers = saved;
  }
  if (defaultProvider) {
    file.defaultProvider = defaultProvider;
  }

  const slots = Object.keys(apiKeys ?? {}).filter((slot) => (apiKeys?.[slot] ?? '').trim().length > 0);
  if (slots.length > 0) {
    const keys: Record<string, string> = {};
    for (const slot of slots) {
      keys[slot] = (apiKeys?.[slot] ?? '').trim();
    }
    file.apiKeys = keys;
  }
  return file;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSettings(raw: unknown): { settings: TransferSettings } | { error: TransferError } {
  if (!isRecord(raw)) {
    return { error: 'invalid-settings' };
  }

  const baseUrl = typeof raw.baseUrl === 'string' ? raw.baseUrl.trim() : '';
  const urlProblem = checkBaseUrl(baseUrl);
  if (urlProblem) {
    return { error: urlProblem.kind === 'insecure' ? 'insecure-base-url' : 'invalid-base-url' };
  }

  const model = typeof raw.model === 'string' ? raw.model.trim() : '';
  if (!model) {
    return { error: 'invalid-model' };
  }

  const style = typeof raw.style === 'string' ? raw.style : '';
  if (!(STYLE_VALUES as readonly string[]).includes(style)) {
    return { error: 'invalid-style' };
  }

  const language = typeof raw.language === 'string' ? raw.language : '';
  if (!(LANGUAGE_VALUES as readonly string[]).includes(language)) {
    return { error: 'invalid-language' };
  }

  const maxDiffChars = typeof raw.maxDiffChars === 'number' ? raw.maxDiffChars : Number.NaN;
  if (!Number.isFinite(maxDiffChars) || maxDiffChars < MIN_MAX_DIFF_CHARS) {
    return { error: 'invalid-max-diff-chars' };
  }

  const customPrompt = typeof raw.customPrompt === 'string' ? raw.customPrompt : '';

  return { settings: { baseUrl, model, style, language, maxDiffChars, customPrompt } };
}

function parseProviders(raw: unknown): { providers: ProviderConfigMap } | { error: TransferError } {
  if (raw === undefined) {
    return { providers: {} };
  }
  if (!isRecord(raw)) {
    return { error: 'invalid-providers' };
  }

  const providers: ProviderConfigMap = {};
  for (const [slot, value] of Object.entries(raw)) {
    if (!slot.trim() || !isRecord(value)) {
      return { error: 'invalid-providers' };
    }
    const baseUrl = typeof value.baseUrl === 'string' ? value.baseUrl.trim() : '';
    const model = typeof value.model === 'string' ? value.model.trim() : '';
    if (!baseUrl || !model || checkBaseUrl(baseUrl)) {
      return { error: 'invalid-providers' };
    }
    providers[slot] = { baseUrl, model };
  }
  return { providers };
}

function parseApiKeys(raw: unknown): { apiKeys: Record<string, string> } | { error: TransferError } {
  if (raw === undefined) {
    return { apiKeys: {} };
  }
  if (!isRecord(raw)) {
    return { error: 'invalid-api-keys' };
  }

  const apiKeys: Record<string, string> = {};
  for (const [slot, value] of Object.entries(raw)) {
    if (typeof value !== 'string') {
      return { error: 'invalid-api-keys' };
    }
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      apiKeys[slot] = trimmed;
    }
  }
  return { apiKeys };
}

// 只认白名单字段，避免导入文件里夹带的任意配置项被写进 settings.json
export function parseTransferFile(raw: string): TransferParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { error: 'invalid-json' };
  }

  if (!isRecord(parsed)) {
    return { error: 'invalid-settings' };
  }
  if (parsed.version !== TRANSFER_VERSION) {
    return { error: 'unsupported-version' };
  }

  const settingsResult = parseSettings(parsed.settings);
  if ('error' in settingsResult) {
    return { error: settingsResult.error };
  }

  const providersResult = parseProviders(parsed.providers);
  if ('error' in providersResult) {
    return { error: providersResult.error };
  }

  const keysResult = parseApiKeys(parsed.apiKeys);
  if ('error' in keysResult) {
    return { error: keysResult.error };
  }

  const file: TransferFile = {
    version: TRANSFER_VERSION,
    settings: settingsResult.settings,
  };
  if (typeof parsed.exportedAt === 'string') {
    file.exportedAt = parsed.exportedAt;
  }
  if (Object.keys(providersResult.providers).length > 0) {
    file.providers = providersResult.providers;
  }
  if (typeof parsed.defaultProvider === 'string' && parsed.defaultProvider.trim()) {
    file.defaultProvider = parsed.defaultProvider.trim();
  }
  if (Object.keys(keysResult.apiKeys).length > 0) {
    file.apiKeys = keysResult.apiKeys;
  }
  return { file };
}
