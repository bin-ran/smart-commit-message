import * as vscode from 'vscode';
import { t } from './i18n';
import { keySlotForBaseUrl } from './presets';

// 一条 secret 里存 JSON map：SecretStorage 无法枚举，分条存就没法展示/清理各槽位状态
export const API_KEYS_SECRET = 'smartCommitMessage.apiKeys';
const LEGACY_SECRET = 'smartCommitMessage.apiKey';
const LEGACY_SETTING = 'apiKey';

type KeyMap = Record<string, string>;

function parseKeyMap(raw: string | undefined): KeyMap {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const map: KeyMap = {};
    for (const [slot, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && value.length > 0) {
        map[slot] = value;
      }
    }
    return map;
  } catch {
    return {};
  }
}

async function readKeyMap(context: vscode.ExtensionContext): Promise<KeyMap> {
  return parseKeyMap(await context.secrets.get(API_KEYS_SECRET));
}

async function writeKeyMap(context: vscode.ExtensionContext, map: KeyMap): Promise<void> {
  const slots = Object.keys(map);
  if (slots.length === 0) {
    await context.secrets.delete(API_KEYS_SECRET);
    return;
  }
  await context.secrets.store(API_KEYS_SECRET, JSON.stringify(map));
}

// 旧版本只存一个全局 Key。迁移只发生在“槽位就是当前配置里的服务商”时，
// 避免给面板查询的其他服务商分到不属于它的 Key。
async function migrateLegacyKey(context: vscode.ExtensionContext, map: KeyMap, slot: string): Promise<string | undefined> {
  const configuration = vscode.workspace.getConfiguration('smartCommitMessage');
  const currentBaseUrl = configuration.get<string>('baseUrl', '');
  if (keySlotForBaseUrl(currentBaseUrl) !== slot) {
    return undefined;
  }

  const legacySecret = await context.secrets.get(LEGACY_SECRET);
  const legacy = (legacySecret ?? configuration.inspect<string>(LEGACY_SETTING)?.globalValue ?? '').trim();
  if (!legacy) {
    return undefined;
  }

  try {
    map[slot] = legacy;
    await writeKeyMap(context, map);
    await context.secrets.delete(LEGACY_SECRET);
    if (configuration.inspect<string>(LEGACY_SETTING)?.globalValue) {
      await configuration.update(LEGACY_SETTING, undefined, vscode.ConfigurationTarget.Global);
    }
    void vscode.window.showInformationMessage(t.apiKeyMigrated());
  } catch {
    // 迁移失败仍用旧值兜底，不阻塞生成
  }
  return legacy;
}

export async function getApiKeyFor(context: vscode.ExtensionContext, baseUrl: string): Promise<string> {
  const map = await readKeyMap(context);
  const slot = keySlotForBaseUrl(baseUrl);
  if (map[slot]) {
    return map[slot];
  }
  return (await migrateLegacyKey(context, map, slot)) ?? '';
}

export async function hasApiKeyFor(context: vscode.ExtensionContext, baseUrl: string): Promise<boolean> {
  return (await getApiKeyFor(context, baseUrl)).length > 0;
}

export async function listApiKeySlots(context: vscode.ExtensionContext): Promise<string[]> {
  return Object.keys(await readKeyMap(context)).sort();
}

// 导出配置时使用，调用方负责不把明文写进日志
export async function listApiKeys(context: vscode.ExtensionContext): Promise<KeyMap> {
  return { ...(await readKeyMap(context)) };
}

export async function setApiKeyFor(context: vscode.ExtensionContext, baseUrl: string, apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return;
  }
  const map = await readKeyMap(context);
  map[keySlotForBaseUrl(baseUrl)] = trimmed;
  await writeKeyMap(context, map);
}

export async function clearApiKeyFor(context: vscode.ExtensionContext, baseUrl: string): Promise<void> {
  const map = await readKeyMap(context);
  delete map[keySlotForBaseUrl(baseUrl)];
  await writeKeyMap(context, map);
}

export async function clearApiKey(context: vscode.ExtensionContext, baseUrl: string): Promise<void> {
  await clearApiKeyFor(context, baseUrl);
  void vscode.window.showInformationMessage(t.apiKeyCleared());
}

export async function promptForApiKey(context: vscode.ExtensionContext, baseUrl: string): Promise<boolean> {
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

  await setApiKeyFor(context, baseUrl, value);
  void vscode.window.showInformationMessage(t.apiKeySaved());
  return true;
}
