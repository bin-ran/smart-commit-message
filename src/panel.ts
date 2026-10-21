import * as vscode from 'vscode';
import { listModels, probeConnection } from './ai';
import { API_KEY_SECRET, CONFIG_DEFAULTS, getApiKey } from './config';
import { describeError, toErrorText } from './errors';
import { panelLabels, t } from './i18n';
import { PROVIDER_PRESETS, type ProviderPreset } from './presets';
import { checkBaseUrl } from './url';
import { renderPanelHtml } from './panelHtml';

export interface PanelState {
  baseUrl: string;
  model: string;
  style: string;
  language: string;
  maxDiffChars: number;
  customPrompt: string;
  hasApiKey: boolean;
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
  | { type: 'clearKey' }
  | { type: 'fetchModels'; payload: { baseUrl: string; apiKey: string } }
  | { type: 'test'; payload: { baseUrl: string; model: string; apiKey: string } }
  | { type: 'close' };

const CONFIG_SECTION = 'smartCommitMessage';
let currentPanel: vscode.WebviewPanel | undefined;

async function buildState(context: vscode.ExtensionContext): Promise<PanelState> {
  const configuration = vscode.workspace.getConfiguration(CONFIG_SECTION);

  return {
    baseUrl: configuration.get<string>('baseUrl', CONFIG_DEFAULTS.baseUrl),
    model: configuration.get<string>('model', CONFIG_DEFAULTS.model),
    style: configuration.get<string>('style', CONFIG_DEFAULTS.style),
    // 未设置时跟随界面语言，面板里用空串表示“跟随界面”
    language: configuration.inspect<string>('language')?.globalValue ?? '',
    maxDiffChars: configuration.get<number>('maxDiffChars', CONFIG_DEFAULTS.maxDiffChars),
    customPrompt: configuration.get<string>('customPrompt', ''),
    hasApiKey: (await getApiKey(context)).length > 0,
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

  await configuration.update('baseUrl', draft.baseUrl.trim(), target);
  await configuration.update('model', draft.model.trim(), target);
  await configuration.update('style', draft.style, target);
  await configuration.update('language', draft.language || undefined, target);
  await configuration.update('maxDiffChars', Math.round(draft.maxDiffChars), target);
  await configuration.update('customPrompt', draft.customPrompt.trim(), target);

  // Key 只写 SecretStorage，配置文件里不留明文
  if (draft.apiKey.trim()) {
    await context.secrets.store(API_KEY_SECRET, draft.apiKey.trim());
  }
  return undefined;
}

async function resolveApiKey(context: vscode.ExtensionContext, typed: string): Promise<string> {
  return typed.trim() || getApiKey(context);
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
      postToPanel(panel, { type: 'saved' });
      return;
    }

    case 'clearKey':
      await context.secrets.delete(API_KEY_SECRET);
      await pushState(context, panel);
      postToPanel(panel, { type: 'saved', message: t.apiKeyCleared() });
      return;

    case 'fetchModels': {
      const apiKey = await resolveApiKey(context, message.payload.apiKey);
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
      const apiKey = await resolveApiKey(context, message.payload.apiKey);
      if (!apiKey) {
        postToPanel(panel, { type: 'testResult', ok: false, message: t.apiKeyMissing() });
        return;
      }
      const target = {
        baseUrl: message.payload.baseUrl.trim(),
        model: message.payload.model.trim(),
        apiKey,
      };
      try {
        const result = await probeConnection(target, { timeoutMs: 20_000 });
        const message = result.viaModelsApi
          ? t.testSuccess(result.elapsedMs, result.models.length)
          : t.testSuccess(result.elapsedMs, 0);
        postToPanel(panel, { type: 'testResult', ok: true, message, models: result.models });
      } catch (err) {
        postToPanel(panel, { type: 'testResult', ok: false, message: describeError(err) });
      }
      return;
    }

    case 'close':
      panel.dispose();
      return;

    default:
      postToPanel(panel, { type: 'error', message: toErrorText(new Error(`unknown message: ${String((message as { type?: string }).type)}`)) });
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
