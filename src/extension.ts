import * as vscode from 'vscode';
import { clearApiKey, getApiKey, getConfig, promptForApiKey, validateConfig } from './config';
import { getDiff, truncateDiff } from './git';
import { ApiError, generateCommitMessage } from './ai';
import { describeError } from './errors';
import { openSettingsPanel } from './panel';
import { t } from './i18n';

interface GitRepository {
  rootUri: vscode.Uri;
  inputBox: { value: string };
}

interface GitApi {
  repositories: GitRepository[];
  getRepository(uri: vscode.Uri): GitRepository | undefined;
}

// VS Code 会把 scm/title 菜单渲染到每个仓库的标题栏，点击时将该仓库的
// SourceControl 作为第一个参数 ctx 传入命令。通过其 rootUri 用 git API
// 直接解析对应仓库，避免依赖 git.repositories 的顺序。
function getTargetRepository(git: GitApi, ctx?: { rootUri?: vscode.Uri }): GitRepository | undefined {
  if (ctx?.rootUri) {
    const repo = git.getRepository(ctx.rootUri);
    if (repo) {
      return repo;
    }
  }

  const editor = vscode.window.activeTextEditor;
  const editorRepo = editor ? git.getRepository(editor.document.uri) : undefined;
  if (editorRepo) {
    return editorRepo;
  }

  return git.repositories[0];
}

// 生成会直接覆盖输入框内容，已有草稿时先确认，避免用户手写的内容丢掉
async function confirmOverwriteDraft(): Promise<boolean> {
  const action = await vscode.window.showWarningMessage(t.confirmOverwrite(), { modal: true }, t.actionOverwrite());
  return action === t.actionOverwrite();
}

async function generate(context: vscode.ExtensionContext, ctx?: { rootUri?: vscode.Uri }): Promise<void> {
  const apiKey = await getApiKey(context);
  if (!apiKey) {
    const action = await vscode.window.showErrorMessage(t.apiKeyMissing(), t.actionOpenSettings());
    if (action === t.actionOpenSettings()) {
      openSettingsPanel(context);
    }
    return;
  }

  const cfg = getConfig(apiKey);
  const error = validateConfig(cfg);
  if (error) {
    vscode.window.showErrorMessage(error);
    return;
  }

  const gitExtension = vscode.extensions.getExtension('vscode.git');
  if (!gitExtension) {
    vscode.window.showErrorMessage(t.noGitExtension());
    return;
  }

  try {
    // 未激活时 exports 为空，先 activate 再取 API
    if (!gitExtension.isActive) {
      await gitExtension.activate();
    }
    const git = gitExtension.exports.getAPI(1) as GitApi;
    const repo = getTargetRepository(git, ctx);
    if (!repo) {
      vscode.window.showErrorMessage(t.noGitRepo());
      return;
    }

    const draft = repo.inputBox.value.trim();
    if (draft && !(await confirmOverwriteDraft())) {
      return;
    }

    const diff = await getDiff(repo.rootUri.fsPath);
    if (!diff) {
      vscode.window.showInformationMessage(t.noChanges());
      return;
    }

    const controller = new AbortController();
    const message = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: t.generating(),
        cancellable: true,
      },
      async (_progress, token) => {
        const subscription = token.onCancellationRequested(() => controller.abort());
        try {
          return await generateCommitMessage(truncateDiff(diff, cfg.maxDiffChars), cfg, { signal: controller.signal });
        } finally {
          subscription.dispose();
        }
      }
    );

    repo.inputBox.value = message;
    vscode.window.showInformationMessage(t.success());
  } catch (err) {
    if (err instanceof ApiError && err.kind === 'cancelled') {
      vscode.window.showInformationMessage(t.generationCancelled());
      return;
    }
    vscode.window.showErrorMessage(`Smart Commit Message: ${describeError(err)}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('smartCommitMessage.generate', (ctx?: { rootUri?: vscode.Uri }) => generate(context, ctx)),
    vscode.commands.registerCommand('smartCommitMessage.setApiKey', () => promptForApiKey(context)),
    vscode.commands.registerCommand('smartCommitMessage.clearApiKey', () => clearApiKey(context)),
    vscode.commands.registerCommand('smartCommitMessage.openSettings', () => openSettingsPanel(context))
  );
}

export function deactivate() {}
