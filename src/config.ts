import * as vscode from 'vscode';
import { inferLanguage, t } from './i18n';
import { DEFAULT_MAX_DIFF_CHARS } from './git';
import { checkBaseUrl } from './url';

export const CONFIG_DEFAULTS = {
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-v4-flash',
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

export function getBaseUrl(): string {
  const config = vscode.workspace.getConfiguration('smartCommitMessage');
  return config.get<string>('baseUrl', CONFIG_DEFAULTS.baseUrl);
}

export function getConfig(apiKey: string): Config {
  const config = vscode.workspace.getConfiguration('smartCommitMessage');
  return {
    apiKey,
    baseUrl: config.get<string>('baseUrl', CONFIG_DEFAULTS.baseUrl),
    model: config.get<string>('model', CONFIG_DEFAULTS.model),
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
