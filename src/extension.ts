import * as vscode from 'vscode';
import { getConfig, validateConfig } from './config';
import { getDiff, truncateDiff } from './git';
import { generateCommitMessage } from './ai';
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

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('smartCommitMessage.generate', async (ctx?: { rootUri?: vscode.Uri }) => {
    const cfg = getConfig();
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
      const git = gitExtension.exports.getAPI(1) as GitApi;
      const repo = getTargetRepository(git, ctx);
      if (!repo) {
        vscode.window.showErrorMessage(t.noGitRepo());
        return;
      }

      const diff = getDiff(repo.rootUri.fsPath);
      if (!diff) {
        vscode.window.showInformationMessage(t.noChanges());
        return;
      }

      const truncatedDiff = truncateDiff(diff);

      const message = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: t.generating(),
          cancellable: false,
        },
        () => generateCommitMessage(truncatedDiff, cfg)
      );

      repo.inputBox.value = message;
      vscode.window.showInformationMessage(t.success());
    } catch (err: any) {
      vscode.window.showErrorMessage(`Smart Commit Message: ${err.message || t.unknownError()}`);
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
