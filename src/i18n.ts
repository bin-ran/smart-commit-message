import * as vscode from 'vscode';

export function isChinese(): boolean {
  return vscode.env.language.toLowerCase().startsWith('zh');
}

export const t = {
  apiKeyMissing: () => isChinese()
    ? 'Smart Commit Message：未配置 API Key，请点击下方按钮或运行命令「设置 API Key」配置。'
    : 'Smart Commit Message: API Key is not configured. Click the button below or run the "Set API Key" command.',
  actionSetApiKey: () => isChinese() ? '设置 API Key' : 'Set API Key',
  apiKeyPromptTitle: () => isChinese() ? 'Smart Commit Message：设置 API Key' : 'Smart Commit Message: Set API Key',
  apiKeyPromptPrompt: () => isChinese()
    ? 'API Key 会保存在 VS Code SecretStorage 中（不写入 settings.json）。'
    : 'The API key is stored in VS Code SecretStorage (never written to settings.json).',
  apiKeyEmpty: () => isChinese() ? 'API Key 不能为空' : 'API Key cannot be empty',
  apiKeySaved: () => isChinese() ? 'Smart Commit Message：API Key 已保存。' : 'Smart Commit Message: API Key saved.',
  apiKeyCleared: () => isChinese() ? 'Smart Commit Message：已清除本地保存的 API Key。' : 'Smart Commit Message: Stored API key cleared.',
  apiKeyMigrated: () => isChinese()
    ? 'Smart Commit Message：已将 settings.json 中的 API Key 迁移到 SecretStorage。'
    : 'Smart Commit Message: API key moved from settings.json to SecretStorage.',
  baseUrlMissing: () => isChinese()
    ? 'Smart Commit Message：未配置 Base URL。'
    : 'Smart Commit Message: Base URL is not configured.',
  invalidBaseUrl: (baseUrl: string) => isChinese()
    ? `Smart Commit Message：Base URL 无效（${baseUrl}），需要形如 https://api.example.com/v1 的地址。`
    : `Smart Commit Message: Invalid base URL (${baseUrl}). Expected something like https://api.example.com/v1.`,
  insecureBaseUrl: (baseUrl: string) => isChinese()
    ? `Smart Commit Message：Base URL 必须使用 https（仅 localhost 允许 http）：${baseUrl}`
    : `Smart Commit Message: Base URL must use https (http is allowed for localhost only): ${baseUrl}`,
  modelMissing: () => isChinese()
    ? 'Smart Commit Message：未配置模型。'
    : 'Smart Commit Message: Model is not configured.',
  invalidMaxDiffChars: () => isChinese()
    ? 'Smart Commit Message：maxDiffChars 必须是不小于 100 的数字。'
    : 'Smart Commit Message: maxDiffChars must be a number no less than 100.',
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
  gitFailed: (detail: string) => isChinese()
    ? `Smart Commit Message：读取 Git 改动失败。${detail}`
    : `Smart Commit Message: Failed to read git changes. ${detail}`,
  requestTimeout: () => isChinese()
    ? 'Smart Commit Message：请求 AI 服务超时（60 秒），请检查网络或更换 baseUrl。'
    : 'Smart Commit Message: The AI request timed out (60s). Check your network or base URL.',
  success: () => isChinese()
    ? 'Smart Commit Message：Commit 信息已生成！'
    : 'Smart Commit Message: Commit message generated!',
  unknownError: () => isChinese() ? '未知错误' : 'Unknown error',
};

export function inferLanguage(): string {
  return isChinese() ? 'Chinese' : 'English';
}
