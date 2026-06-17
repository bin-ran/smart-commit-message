import * as vscode from 'vscode';
import { getConfig, validateConfig } from './config';
import { getGitRepositoryPath, getDiff, truncateDiff } from './git';
import { generateCommitMessage } from './ai';
import { t } from './i18n';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('autoCommit.generate', async () => {
    const cfg = getConfig();
    const error = validateConfig(cfg);
    if (error) {
      vscode.window.showErrorMessage(error);
      return;
    }

    const repoPath = getGitRepositoryPath();
    if (!repoPath) {
      vscode.window.showErrorMessage(t.noWorkspace());
      return;
    }

    const diff = getDiff(repoPath);
    if (!diff) {
      vscode.window.showInformationMessage(t.noChanges());
      return;
    }

    const truncatedDiff = truncateDiff(diff);

    try {
      const message = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: t.generating(),
          cancellable: false,
        },
        () => generateCommitMessage(truncatedDiff, cfg)
      );

      const gitExtension = vscode.extensions.getExtension('vscode.git');
      if (!gitExtension) {
        vscode.window.showErrorMessage(t.noGitExtension());
        return;
      }

      const git = gitExtension.exports.getAPI(1);
      const repo = git.repositories[0];
      if (!repo) {
        vscode.window.showErrorMessage(t.noGitRepo());
        return;
      }

      repo.inputBox.value = message;
      vscode.window.showInformationMessage(t.success());
    } catch (err: any) {
      vscode.window.showErrorMessage(`Auto Commit: ${err.message || t.unknownError()}`);
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
