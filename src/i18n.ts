import * as vscode from 'vscode';

export function isChinese(): boolean {
  return vscode.env.language.toLowerCase().startsWith('zh');
}

export const t = {
  apiKeyMissing: () => isChinese()
    ? 'Auto Commit：未配置 API Key，请在设置中配置 autoCommit.apiKey。'
    : 'Auto Commit: API Key is not configured. Please set it in Settings (autoCommit.apiKey).',
  baseUrlMissing: () => isChinese()
    ? 'Auto Commit：未配置 Base URL。'
    : 'Auto Commit: Base URL is not configured.',
  modelMissing: () => isChinese()
    ? 'Auto Commit：未配置模型。'
    : 'Auto Commit: Model is not configured.',
  noWorkspace: () => isChinese()
    ? 'Auto Commit：未找到工作区文件夹。'
    : 'Auto Commit: No workspace folder found.',
  noChanges: () => isChinese()
    ? 'Auto Commit：未检测到代码改动。'
    : 'Auto Commit: No changes detected.',
  generating: () => isChinese()
    ? '正在生成 Commit 信息...'
    : 'Generating commit message...',
  noGitExtension: () => isChinese()
    ? 'Auto Commit：未找到 Git 扩展。'
    : 'Auto Commit: Git extension not found.',
  noGitRepo: () => isChinese()
    ? 'Auto Commit：未找到 Git 仓库。'
    : 'Auto Commit: No git repository found.',
  success: () => isChinese()
    ? 'Auto Commit：Commit 信息已生成！'
    : 'Auto Commit: Commit message generated!',
  unknownError: () => isChinese() ? '未知错误' : 'Unknown error',
};

export function inferLanguage(): string {
  return isChinese() ? 'Chinese' : 'English';
}
