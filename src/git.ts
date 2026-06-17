import { execSync } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

export function getGitRepositoryPath(): string | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }
  return workspaceFolders[0].uri.fsPath;
}

export function getDiff(cwd: string): string {
  try {
    let diff = execSync('git diff --cached', { cwd, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    if (!diff.trim()) {
      diff = execSync('git diff', { cwd, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    }
    return diff.trim();
  } catch {
    return '';
  }
}

export function truncateDiff(diff: string, maxChars: number = 8000): string {
  if (diff.length <= maxChars) {
    return diff;
  }
  return diff.slice(0, maxChars) + '\n\n... (diff truncated)';
}
