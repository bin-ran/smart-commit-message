import * as vscode from 'vscode';
import { inferLanguage, t } from './i18n';
import { DEFAULT_MAX_DIFF_CHARS } from './git';
import { checkBaseUrl } from './url';

export const API_KEY_SECRET = 'smartCommitMessage.apiKey';
const LEGACY_API_KEY_SETTING = 'apiKey';

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

// API Key 只存 SecretStorage：settings.json 里的值会随 Settings Sync 同步、
// 也能被工作区配置覆盖，不适合放密钥。
export async function getApiKey(context: vscode.ExtensionContext): Promise<string> {
  const stored = await context.secrets.get(API_KEY_SECRET);
  if (stored) {
    return stored;
  }
  return migrateLegacyApiKey(context);
}

// 把旧版本写在用户 settings.json 里的 apiKey 迁移到 SecretStorage，只认用户级
// （globalValue）的值，工作区配置文件里的值不迁移。
async function migrateLegacyApiKey(context: vscode.ExtensionContext): Promise<string> {
  const configuration = vscode.workspace.getConfiguration('smartCommitMessage');
  const legacy = (configuration.inspect<string>(LEGACY_API_KEY_SETTING)?.globalValue ?? '').trim();
  if (!legacy) {
    return '';
  }

  try {
    await context.secrets.store(API_KEY_SECRET, legacy);
    await configuration.update(LEGACY_API_KEY_SETTING, undefined, vscode.ConfigurationTarget.Global);
    void vscode.window.showInformationMessage(t.apiKeyMigrated());
  } catch {
    // 迁移失败时仍用旧值兜底，不阻塞生成
  }
  return legacy;
}

export async function promptForApiKey(context: vscode.ExtensionContext): Promise<boolean> {
  const value = await vscode.window.showInputBox({
    title: t.apiKeyPromptTitle(),
    prompt: t.apiKeyPromptPrompt(),
    password: true,
    ignoreFocusOut: true,
    placeHolder: 'sk-...',
    validateInput: (input) => (input.trim() ? undefined : t.apiKeyEmpty()),
  });
  if (value === undefined) {
    return false;
  }

  await context.secrets.store(API_KEY_SECRET, value.trim());
  void vscode.window.showInformationMessage(t.apiKeySaved());
  return true;
}

export async function clearApiKey(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(API_KEY_SECRET);
  void vscode.window.showInformationMessage(t.apiKeyCleared());
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
