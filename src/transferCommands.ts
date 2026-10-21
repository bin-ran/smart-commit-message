import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  buildTransferFile,
  parseTransferFile,
  type TransferSettings,
} from './configTransfer';
import { CONFIG_DEFAULTS, getProviderSettings } from './config';
import { toErrorText } from './errors';
import { t } from './i18n';
import { listApiKeys, setApiKeyFor } from './keys';
import { baseUrlForKeySlot } from './presets';
import { normalizeProviderMap } from './providers';

const CONFIG_SECTION = 'smartCommitMessage';
const DEFAULT_FILE_NAME = 'smart-commit-message.config.json';

function readCurrentSettings(): TransferSettings {
  const configuration = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return {
    baseUrl: configuration.get<string>('baseUrl', CONFIG_DEFAULTS.baseUrl),
    model: configuration.get<string>('model', CONFIG_DEFAULTS.model),
    style: configuration.get<string>('style', CONFIG_DEFAULTS.style),
    language: configuration.inspect<string>('language')?.globalValue ?? '',
    maxDiffChars: configuration.get<number>('maxDiffChars', CONFIG_DEFAULTS.maxDiffChars),
    customPrompt: configuration.get<string>('customPrompt', ''),
  };
}

function defaultExportUri(): vscode.Uri {
  const folder = vscode.workspace.workspaceFolders?.[0];
  const baseDir = folder ? folder.uri.fsPath : os.homedir();
  return vscode.Uri.file(path.join(baseDir, DEFAULT_FILE_NAME));
}

export async function exportConfiguration(context: vscode.ExtensionContext): Promise<void> {
  const apiKeys = await listApiKeys(context);
  const keyCount = Object.keys(apiKeys).length;
  let includeKeys = false;

  if (keyCount > 0) {
    // Key 只能明文写盘，交给用户显式选择
    const choice = await vscode.window.showWarningMessage(
      t.exportKeysPrompt(),
      { modal: true },
      t.exportIncludeKeys(),
      t.exportWithoutKeys()
    );
    if (!choice) {
      return;
    }
    includeKeys = choice === t.exportIncludeKeys();
  }

  const target = await vscode.window.showSaveDialog({
    saveLabel: t.exportAction(),
    defaultUri: defaultExportUri(),
    filters: { JSON: ['json'] },
  });
  if (!target) {
    return;
  }

  const { providers, defaultSlot } = getProviderSettings();
  const file = buildTransferFile({
    settings: readCurrentSettings(),
    providers,
    defaultProvider: defaultSlot,
    apiKeys: includeKeys ? apiKeys : undefined,
  });
  try {
    await fs.writeFile(target.fsPath, `${JSON.stringify(file, null, 2)}\n`, 'utf-8');
    void vscode.window.showInformationMessage(t.exported(target.fsPath, includeKeys ? keyCount : 0));
  } catch (err) {
    void vscode.window.showErrorMessage(t.exportFailed(toErrorText(err)));
  }
}

export async function importConfiguration(context: vscode.ExtensionContext): Promise<void> {
  const picked = await vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: t.importAction(),
    filters: { JSON: ['json'] },
  });
  const target = picked?.[0];
  if (!target) {
    return;
  }

  let raw: string;
  try {
    raw = await fs.readFile(target.fsPath, 'utf-8');
  } catch (err) {
    void vscode.window.showErrorMessage(t.importFailed(toErrorText(err)));
    return;
  }

  const parsed = parseTransferFile(raw);
  if ('error' in parsed) {
    void vscode.window.showErrorMessage(t.transferError(parsed.error));
    return;
  }

  const { settings } = parsed.file;
  const keyEntries = Object.entries(parsed.file.apiKeys ?? {});
  let importKeys = false;

  if (keyEntries.length > 0) {
    const choice = await vscode.window.showWarningMessage(
      t.importKeysWarning(keyEntries.length),
      { modal: true },
      t.importIncludeKeys(),
      t.importSkipKeys()
    );
    if (!choice) {
      return;
    }
    importKeys = choice === t.importIncludeKeys();
  }

  const configuration = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const configTarget = vscode.ConfigurationTarget.Global;

  // 服务商配置整体替换；旧字段仅作为没有 providers 时的兜底
  await configuration.update('providers', normalizeProviderMap(parsed.file.providers ?? {}), configTarget);
  await configuration.update('defaultProvider', parsed.file.defaultProvider ?? '', configTarget);
  await configuration.update('baseUrl', settings.baseUrl, configTarget);
  await configuration.update('model', settings.model, configTarget);
  await configuration.update('style', settings.style, configTarget);
  await configuration.update('language', settings.language || undefined, configTarget);
  await configuration.update('maxDiffChars', Math.round(settings.maxDiffChars), configTarget);
  await configuration.update('customPrompt', settings.customPrompt, configTarget);

  let appliedKeys = 0;
  let skippedKeys = 0;
  if (importKeys) {
    for (const [slot, apiKey] of keyEntries) {
      const baseUrl = baseUrlForKeySlot(slot);
      if (!baseUrl) {
        skippedKeys += 1;
        continue;
      }
      await setApiKeyFor(context, baseUrl, apiKey);
      appliedKeys += 1;
    }
  }

  void vscode.window.showInformationMessage(t.imported(appliedKeys, skippedKeys));
}
