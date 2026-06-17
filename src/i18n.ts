import * as vscode from 'vscode';

export function isChinese(): boolean {
  return vscode.env.language.toLowerCase().startsWith('zh');
}

export const t = {
  apiKeyMissing: () => isChinese()
    ? 'Smart Commit Message：未配置 API Key，请在设置中配置 smartCommitMessage.apiKey。'
    : 'Smart Commit Message: API Key is not configured. Please set it in Settings (smartCommitMessage.apiKey).',
  baseUrlMissing: () => isChinese()
    ? 'Smart Commit Message：未配置 Base URL。'
    : 'Smart Commit Message: Base URL is not configured.',
  modelMissing: () => isChinese()
    ? 'Smart Commit Message：未配置模型。'
    : 'Smart Commit Message: Model is not configured.',
  noWorkspace: () => isChinese()
    ? 'Smart Commit Message：未找到工作区文件夹。'
    : 'Smart Commit Message: No workspace folder found.',
  noChanges: () => isChinese()
    ? 'Smart Commit Message：未检测到代码改动。'
    : 'Smart Commit Message: No changes detected.',
  generating: () => isChinese()
    ? '正在生成 Commit 信息...'
    : 'Generating commit message...',
  noGitExtension: () => isChinese()
    ? 'Smart Commit Message：未找到 Git 扩展。'
    : 'Smart Commit Message: Git extension not found.',
  noGitRepo: () => isChinese()
    ? 'Smart Commit Message：未找到 Git 仓库。'
    : 'Smart Commit Message: No git repository found.',
  success: () => isChinese()
    ? 'Smart Commit Message：Commit 信息已生成！'
    : 'Smart Commit Message: Commit message generated!',
  unknownError: () => isChinese() ? '未知错误' : 'Unknown error',
};

export function inferLanguage(): string {
  return isChinese() ? 'Chinese' : 'English';
}
