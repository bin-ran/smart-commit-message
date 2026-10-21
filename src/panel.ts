import * as vscode from 'vscode';
import { listModels, probeConnection } from './ai';
import { CONFIG_DEFAULTS, ensureProviderMigration, getBaseUrl, getProviderSettings } from './config';
import { describeError, toErrorText } from './errors';
import { panelLabels, t } from './i18n';
import { clearApiKeyFor, getApiKeyFor, hasApiKeyFor, listApiKeySlots, setApiKeyFor } from './keys';
import { keySlotForBaseUrl, PROVIDER_PRESETS, type ProviderPreset } from './presets';
import { upsertProviderConfig, type ProviderConfigMap } from './providers';
import { checkBaseUrl } from './url';
import { exportConfiguration, importConfiguration } from './transferCommands';
import { renderPanelHtml } from './panelHtml';

export interface PanelState {
  slot: string;
  defaultSlot: string;
  providerConfigs: ProviderConfigMap;
  baseUrl: string;
  model: string;
  style: string;
  language: string;
  maxDiffChars: number;
  customPrompt: string;
  defaultBaseUrl: string;
  hasApiKey: boolean;
  keySlots: string[];
  providers: ProviderPreset[];
  labels: Record<string, string>;
}

interface PanelDraft {
  baseUrl: string;
  model: string;
  style: string;
  language: string;
  maxDiffChars: number;
  customPrompt: string;
  apiKey: string;
}

type PanelMessage =
  | { type: 'ready' }
  | { type: 'save'; payload: PanelDraft }
  | { type: 'setDefault'; payload: { baseUrl: string } }
  | { type: 'clearKey'; payload?: { baseUrl: string } }
  | { type: 'keyState'; payload: { baseUrl: string } }
  | { type: 'fetchModels'; payload: { baseUrl: string; apiKey: string } }
  | { type: 'test'; payload: { baseUrl: string; model: string; apiKey: string } }
  | { type: 'exportConfig' }
  | { type: 'importConfig' }
  | { type: 'close' };

const CONFIG_SECTION = 'smartCommitMessage';
let currentPanel: vscode.WebviewPanel | undefined;

async function buildState(context: vscode.ExtensionContext): Promise<PanelState> {
  await ensureProviderMigration();
  const configuration = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const { providers, defaultSlot, active } = getProviderSettings();
  const baseUrl = active.baseUrl;

  return {
    slot: keySlotForBaseUrl(baseUrl),
    defaultSlot,
    providerConfigs: providers,
    baseUrl,
    model: active.model,
    style: configuration.get<string>('style', CONFIG_DEFAULTS.style),
    // 未设置时跟随界面语言，面板里用空串表示“跟随界面”
    language: configuration.inspect<string>('language')?.globalValue ?? '',
    maxDiffChars: configuration.get<number>('maxDiffChars', CONFIG_DEFAULTS.maxDiffChars),
    customPrompt: configuration.get<string>('customPrompt', ''),
    defaultBaseUrl: baseUrl,
    hasApiKey: await hasApiKeyFor(context, baseUrl),
    keySlots: await listApiKeySlots(context),
    providers: PROVIDER_PRESETS,
    labels: panelLabels(),
  };
}

function postToPanel(panel: vscode.WebviewPanel, message: unknown): void {
  void panel.webview.postMessage(message);
}

async function pushState(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): Promise<void> {
  postToPanel(panel, { type: 'state', state: await buildState(context) });
}

function validateDraft(draft: PanelDraft): string | undefined {
  const problem = checkBaseUrl(draft.baseUrl.trim());
  if (problem) {
    return problem.kind === 'invalid' ? t.invalidBaseUrl(draft.baseUrl) : t.insecureBaseUrl(draft.baseUrl);
  }
  if (!draft.model.trim()) {
    return t.modelMissing();
  }
  if (!Number.isFinite(draft.maxDiffChars) || draft.maxDiffChars < 100) {
    return t.invalidMaxDiffChars();
  }
  return undefined;
}

async function saveDraft(context: vscode.ExtensionContext, draft: PanelDraft): Promise<string | undefined> {
  const problem = validateDraft(draft);
  if (problem) {
    return t.panelSaveFailed(problem);
  }

  const configuration = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const target = vscode.ConfigurationTarget.Global;

  // 只更新该服务商自己的配置，默认服务商由“设为默认”单独决定
  const { providers } = getProviderSettings();
  const nextProviders = upsertProviderConfig(providers, draft.baseUrl.trim(), draft.model.trim());
  await configuration.update('providers', nextProviders, target);
  await configuration.update('style', draft.style, target);
  await configuration.update('language', draft.language || undefined, target);
  await configuration.update('maxDiffChars', Math.round(draft.maxDiffChars), target);
  await configuration.update('customPrompt', draft.customPrompt.trim(), target);

  // Key 只写进当前服务商的槽位，配置文件里不留明文
  await setApiKeyFor(context, draft.baseUrl.trim(), draft.apiKey);
  return undefined;
}

async function resolveApiKey(context: vscode.ExtensionContext, baseUrl: string, typed: string): Promise<string> {
  return typed.trim() || getApiKeyFor(context, baseUrl.trim());
}

async function handleMessage(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, message: PanelMessage): Promise<void> {
  switch (message.type) {
    case 'ready':
      await pushState(context, panel);
      return;

    case 'save': {
      const error = await saveDraft(context, message.payload);
      if (error) {
        postToPanel(panel, { type: 'error', message: error });
        return;
      }
      await pushState(context, panel);
      postToPanel(panel, { type: 'saved', message: t.savedProviderConfig() });
      return;
    }

    case 'setDefault': {
      const baseUrl = message.payload.baseUrl.trim();
      const { providers } = getProviderSettings();
      const slot = keySlotForBaseUrl(baseUrl);
      if (!providers[slot]) {
        postToPanel(panel, { type: 'error', message: t.saveBeforeSetDefault() });
        return;
      }
      await vscode.workspace
        .getConfiguration(CONFIG_SECTION)
        .update('defaultProvider', slot, vscode.ConfigurationTarget.Global);
      await pushState(context, panel);
      postToPanel(panel, { type: 'saved', message: t.defaultUpdated() });
      return;
    }

    case 'keyState': {
      const baseUrl = message.payload.baseUrl.trim();
      postToPanel(panel, {
        type: 'keyState',
        baseUrl,
        hasKey: baseUrl ? await hasApiKeyFor(context, baseUrl) : false,
      });
      return;
    }

    case 'clearKey': {
      const baseUrl = (message.payload?.baseUrl ?? getBaseUrl()).trim();
      await clearApiKeyFor(context, baseUrl);
      await pushState(context, panel);
      postToPanel(panel, { type: 'saved', message: t.apiKeyClearedForProvider() });
      return;
    }

    case 'fetchModels': {
      const apiKey = await resolveApiKey(context, message.payload.baseUrl, message.payload.apiKey);
      if (!apiKey) {
        postToPanel(panel, { type: 'error', message: t.apiKeyMissing() });
        return;
      }
      try {
        const models = await listModels({ baseUrl: message.payload.baseUrl.trim(), apiKey });
        postToPanel(panel, { type: 'models', models, message: t.modelsLoaded(models.length) });
      } catch (err) {
        postToPanel(panel, { type: 'models', models: [], message: describeError(err) });
      }
      return;
    }

    case 'test': {
      const apiKey = await resolveApiKey(context, message.payload.baseUrl, message.payload.apiKey);
      if (!apiKey) {
        postToPanel(panel, { type: 'testResult', ok: false, message: t.apiKeyMissing() });
        return;
      }
      try {
        const result = await probeConnection(
          { baseUrl: message.payload.baseUrl.trim(), model: message.payload.model.trim(), apiKey },
          { timeoutMs: 20_000 }
        );
        postToPanel(panel, {
          type: 'testResult',
          ok: true,
          message: t.testSuccess(result.elapsedMs, result.models.length),
          models: result.models,
        });
      } catch (err) {
        postToPanel(panel, { type: 'testResult', ok: false, message: describeError(err) });
      }
      return;
    }

    case 'exportConfig':
      await exportConfiguration(context);
      return;

    case 'importConfig':
      await importConfiguration(context);
      await pushState(context, panel);
      return;

    case 'close':
      panel.dispose();
      return;

    default:
      postToPanel(panel, { type: 'error', message: toErrorText(new Error('unknown panel message')) });
  }
}

export function openSettingsPanel(context: vscode.ExtensionContext): void {
  if (currentPanel) {
    currentPanel.reveal();
    void pushState(context, currentPanel);
    return;
  }

  const panel = vscode.window.createWebviewPanel('smartCommitMessage.settings', t.panelTitle(), vscode.ViewColumn.Active, {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [context.extensionUri],
  });
  currentPanel = panel;
  panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');
  panel.webview.html = renderPanelHtml(panel.webview);

  const disposables = [
    panel.webview.onDidReceiveMessage((message: PanelMessage) => {
      void handleMessage(context, panel, message);
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(CONFIG_SECTION)) {
        void pushState(context, panel);
      }
    }),
  ];

  panel.onDidDispose(() => {
    currentPanel = undefined;
    for (const disposable of disposables) {
      disposable.dispose();
    }
  });
}
