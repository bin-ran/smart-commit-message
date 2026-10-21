import * as vscode from 'vscode';
import { inferLanguage, t } from './i18n';
import { DEFAULT_MAX_DIFF_CHARS } from './git';
import { checkBaseUrl } from './url';
import { normalizeProviderMap, resolveActiveProvider, upsertProviderConfig, type ActiveProvider, type ProviderConfigMap } from './providers';

export const CONFIG_DEFAULTS = {
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-flash',
  style: 'conventional' as const,
  maxDiffChars: DEFAULT_MAX_DIFF_CHARS,
};

export interface Config {
  apiKey: string;
  baseUrl: string;
  model: string;
  style: 'conventional' | 'simple' | 'detailed';
  language: string;
  customPrompt: string;
  maxDiffChars: number;
}

export interface ProviderSettings {
  providers: ProviderConfigMap;
  defaultSlot: string;
  active: ActiveProvider;
}

function readProviderSettings(): ProviderSettings {
  const config = vscode.workspace.getConfiguration('smartCommitMessage');
  const providers = normalizeProviderMap(config.get<unknown>('providers', {}));
  const defaultSlot = config.get<string>('defaultProvider', '');
  const fallback = {
    baseUrl: config.get<string>('baseUrl', CONFIG_DEFAULTS.baseUrl),
    model: config.get<string>('model', CONFIG_DEFAULTS.model),
  };
  return { providers, defaultSlot, active: resolveActiveProvider(providers, defaultSlot, fallback) };
}

export function getProviderSettings(): ProviderSettings {
  return readProviderSettings();
}

// 生成时使用默认服务商的 baseUrl
export function getBaseUrl(): string {
  return readProviderSettings().active.baseUrl;
}

// 老用户只有全局 baseUrl/model：首次运行时写成 providers 里的一个条目并设为默认
export async function ensureProviderMigration(): Promise<void> {
  const configuration = vscode.workspace.getConfiguration('smartCommitMessage');
  const { providers, defaultSlot, active } = readProviderSettings();
  if (defaultSlot && providers[defaultSlot]) {
    return;
  }

  const next = upsertProviderConfig(providers, active.baseUrl, active.model);
  const target = vscode.ConfigurationTarget.Global;
  await configuration.update('providers', next, target);
  await configuration.update('defaultProvider', active.slot, target);
}

export function getConfig(apiKey: string): Config {
  const config = vscode.workspace.getConfiguration('smartCommitMessage');
  const { active } = readProviderSettings();
  return {
    apiKey,
    baseUrl: active.baseUrl,
    model: active.model,
    style: config.get<'conventional' | 'simple' | 'detailed'>('style', CONFIG_DEFAULTS.style),
    language: config.get<string>('language', inferLanguage()),
    customPrompt: config.get<string>('customPrompt', ''),
    maxDiffChars: config.get<number>('maxDiffChars', CONFIG_DEFAULTS.maxDiffChars),
  };
}

// baseUrl 走 https；只有回环地址允许明文 http，避免 API Key 在网络上裸奔。
export function validateBaseUrl(baseUrl: string): string | undefined {
  const problem = checkBaseUrl(baseUrl);
  if (!problem) {
    return undefined;
  }
  return problem.kind === 'invalid' ? t.invalidBaseUrl(problem.baseUrl) : t.insecureBaseUrl(problem.baseUrl);
}

export function validateConfig(cfg: Config): string | undefined {
  if (!cfg.apiKey) {
    return t.apiKeyMissing();
  }
  if (!cfg.baseUrl) {
    return t.baseUrlMissing();
  }
  if (!cfg.model) {
    return t.modelMissing();
  }
  if (!Number.isFinite(cfg.maxDiffChars) || cfg.maxDiffChars < 100) {
    return t.invalidMaxDiffChars();
  }
  return validateBaseUrl(cfg.baseUrl);
}
