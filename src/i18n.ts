import * as vscode from 'vscode';

export function isChinese(): boolean {
  return vscode.env.language.toLowerCase().startsWith('zh');
}

export const t = {
  apiKeyMissing: () => isChinese()
    ? 'Smart Commit Message：未配置 API Key，请点击下方按钮或运行命令「设置 API Key」配置。'
    : 'Smart Commit Message: API Key is not configured. Click the button below or run the "Set API Key" command.',
  actionOpenSettings: () => isChinese() ? '打开配置' : 'Open settings',
  apiKeyPromptTitle: () => isChinese() ? 'Smart Commit Message：设置 API Key' : 'Smart Commit Message: Set API Key',
  apiKeyPromptPrompt: () => isChinese()
    ? 'API Key 会保存在 VS Code SecretStorage 中（不写入 settings.json）。'
    : 'The API key is stored in VS Code SecretStorage (never written to settings.json).',
  apiKeyEmpty: () => isChinese() ? 'API Key 不能为空' : 'API Key cannot be empty',
  apiKeySaved: () => isChinese() ? 'Smart Commit Message：API Key 已保存。' : 'Smart Commit Message: API Key saved.',
  apiKeyCleared: () => isChinese() ? 'Smart Commit Message：已清除本地保存的 API Key。' : 'Smart Commit Message: Stored API key cleared.',
  apiKeyClearedForProvider: () => isChinese()
    ? 'Smart Commit Message：已清除该服务商的 API Key。'
    : 'Smart Commit Message: API key cleared for this provider.',
  savedProviderConfig: () => isChinese()
    ? '已保存该服务商的配置（未改变默认服务商）'
    : 'Provider configuration saved (default provider unchanged)',
  defaultUpdated: () => isChinese()
    ? '已设为默认服务商，生成时使用它'
    : 'Set as the default provider used for generation',
  saveBeforeSetDefault: () => isChinese()
    ? '请先保存当前服务商的配置，再设为默认。'
    : 'Save this provider before setting it as the default.',
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
  noChanges: () => isChinese()
    ? 'Smart Commit Message：未检测到代码改动。'
    : 'Smart Commit Message: No changes detected.',
  generating: () => isChinese()
    ? '正在生成 Commit 信息...'
    : 'Generating commit message...',
  confirmOverwrite: () => isChinese()
    ? 'Smart Commit Message：Commit 输入框已有内容，生成后将覆盖。是否继续？'
    : 'Smart Commit Message: The commit input box already has content that will be overwritten. Continue?',
  actionOverwrite: () => isChinese() ? '覆盖并生成' : 'Overwrite and generate',
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
  requestFailed: (detail: string) => isChinese()
    ? `Smart Commit Message：AI 服务返回错误。${detail}`
    : `Smart Commit Message: The AI service returned an error. ${detail}`,
  invalidResponse: () => isChinese()
    ? 'Smart Commit Message：AI 服务返回的内容无法解析为 JSON。'
    : 'Smart Commit Message: The AI service response could not be parsed as JSON.',
  emptyResponse: () => isChinese()
    ? 'Smart Commit Message：AI 服务返回了空的 Commit 信息。'
    : 'Smart Commit Message: The AI service returned an empty commit message.',
  networkFailed: (detail: string) => isChinese()
    ? `Smart Commit Message：请求 AI 服务失败。${detail}`
    : `Smart Commit Message: Failed to reach the AI service. ${detail}`,
  generationCancelled: () => isChinese()
    ? 'Smart Commit Message：已取消生成。'
    : 'Smart Commit Message: Generation cancelled.',
  success: () => isChinese()
    ? 'Smart Commit Message：Commit 信息已生成！'
    : 'Smart Commit Message: Commit message generated!',
  unknownError: () => isChinese() ? '未知错误' : 'Unknown error',
  panelTitle: () => isChinese() ? '配置大模型' : 'Configure Model',
  testSuccess: (elapsedMs: number, modelCount: number) => isChinese()
    ? `连接成功 · ${elapsedMs} ms${modelCount > 0 ? ` · ${modelCount} 个模型` : ''}`
    : `Connected · ${elapsedMs} ms${modelCount > 0 ? ` · ${modelCount} models` : ''}`,
  modelsLoaded: (count: number) => isChinese() ? `已拉取 ${count} 个模型` : `Loaded ${count} models`,
  modelsUnavailable: () => isChinese()
    ? '该服务不支持模型列表接口，请手动填写模型名。'
    : 'This service does not expose a model list; enter the model name manually.',
  exportKeysPrompt: () => isChinese()
    ? '导出文件是否包含 API Key？包含时 Key 会以明文写入 JSON，请妥善保管。'
    : 'Include API keys in the exported file? Keys are written as plain text, so keep the file safe.',
  exportIncludeKeys: () => isChinese() ? '包含 Key' : 'Include keys',
  exportWithoutKeys: () => isChinese() ? '不含 Key' : 'Settings only',
  exportAction: () => isChinese() ? '导出' : 'Export',
  exported: (filePath: string, keyCount: number) => isChinese()
    ? `配置已导出到 ${filePath}${keyCount > 0 ? `（含 ${keyCount} 个 API Key，明文）` : ''}`
    : `Configuration exported to ${filePath}${keyCount > 0 ? ` (including ${keyCount} API keys in plain text)` : ''}`,
  exportFailed: (detail: string) => isChinese() ? `导出失败：${detail}` : `Export failed: ${detail}`,
  importAction: () => isChinese() ? '导入' : 'Import',
  importKeysWarning: (count: number) => isChinese()
    ? `该文件包含 ${count} 个 API Key（明文）。是否一并导入？`
    : `This file contains ${count} API key(s) in plain text. Import them as well?`,
  importIncludeKeys: () => isChinese() ? '导入 Key' : 'Import keys',
  importSkipKeys: () => isChinese() ? '仅导入设置' : 'Settings only',
  importFailed: (detail: string) => isChinese() ? `导入失败：${detail}` : `Import failed: ${detail}`,
  imported: (keyCount: number, skippedCount: number) => isChinese()
    ? `配置已导入${keyCount > 0 ? `，含 ${keyCount} 个 API Key` : ''}${skippedCount > 0 ? `；${skippedCount} 个未知槽位的 Key 已跳过` : ''}`
    : `Configuration imported${keyCount > 0 ? ` with ${keyCount} API key(s)` : ''}${skippedCount > 0 ? `; ${skippedCount} key(s) for unknown slots were skipped` : ''}`,
  transferError: (code: string) => {
    const zh: Record<string, string> = {
      'invalid-json': '文件不是合法的 JSON。',
      'unsupported-version': '配置文件版本不受支持。',
      'invalid-settings': '文件缺少 settings 配置段。',
      'invalid-base-url': '配置文件里的 Base URL 无效。',
      'insecure-base-url': '配置文件里的 Base URL 不是 https（仅 localhost 允许 http）。',
      'invalid-model': '配置文件里的模型名为空。',
      'invalid-style': '配置文件里的风格取值无效。',
      'invalid-language': '配置文件里的语言取值无效。',
      'invalid-max-diff-chars': '配置文件里的 maxDiffChars 必须是不小于 100 的数字。',
      'invalid-api-keys': '配置文件里的 API Key 段格式无效。',
      'invalid-providers': '配置文件里的服务商配置段格式无效。',
    };
    const en: Record<string, string> = {
      'invalid-json': 'The file is not valid JSON.',
      'unsupported-version': 'The configuration file version is not supported.',
      'invalid-settings': 'The file has no settings section.',
      'invalid-base-url': 'The base URL in the file is invalid.',
      'insecure-base-url': 'The base URL in the file is not https (http is only allowed for localhost).',
      'invalid-model': 'The model name in the file is empty.',
      'invalid-style': 'The style value in the file is invalid.',
      'invalid-language': 'The language value in the file is invalid.',
      'invalid-max-diff-chars': 'maxDiffChars in the file must be a number no less than 100.',
      'invalid-api-keys': 'The API keys section in the file is malformed.',
      'invalid-providers': 'The providers section in the file is malformed.',
    };
    const table = isChinese() ? zh : en;
    return `Smart Commit Message: ${table[code] ?? (isChinese() ? '配置无法识别。' : 'The configuration is not recognised.')}`;
  },
  panelSaveFailed: (detail: string) => isChinese()
    ? `配置未保存：${detail}`
    : `Configuration was not saved: ${detail}`,
};

// 配置面板的界面文案，整体下发给 webview，避免在 HTML 里硬编码两份
export function panelLabels(): Record<string, string> {
  const zh = isChinese();
  const pick = (zhText: string, enText: string) => (zh ? zhText : enText);

  return {
    providerTitle: pick('服务商', 'Provider'),
    connectionTitle: pick('连接', 'Connection'),
    generateTitle: pick('生成选项', 'Generation'),
    baseUrl: 'Base URL',
    baseUrlHint: pick('需使用 https（仅 localhost 可用 http）', 'Must use https (http only for localhost)'),
    model: pick('模型', 'Model'),
    modelHint: pick('可直接输入，或从拉取到的列表里选', 'Type a name or pick one from the fetched list'),
    apiKey: 'API Key',
    apiKeyPlaceholder: pick('留空表示不修改已保存的 Key', 'Leave empty to keep the saved key'),
    apiKeySaved: pick('已保存在 VS Code SecretStorage', 'Saved in VS Code SecretStorage'),
    apiKeyNotSet: pick('尚未设置', 'Not configured yet'),
    clearKey: pick('清除', 'Clear'),
    fetchModels: pick('拉取模型', 'Fetch models'),
    fetching: pick('拉取中...', 'Fetching...'),
    style: pick('风格', 'Style'),
    styleConventional: 'conventional',
    styleSimple: 'simple',
    styleDetailed: 'detailed',
    language: pick('语言', 'Language'),
    languageAuto: pick('跟随界面', 'Follow UI'),
    maxDiffChars: pick('diff 字符上限', 'Max diff characters'),
    maxDiffCharsHint: pick('超出时从尾部按文件整段丢弃', 'Whole files are dropped from the end once this limit is exceeded'),
    customPrompt: pick('自定义提示词', 'Custom prompt'),
    customPromptPlaceholder: pick('选填，追加在风格模板之后', 'Optional, appended after the style template'),
    test: pick('测试连接', 'Test connection'),
    testing: pick('正在测试...', 'Testing...'),
    save: pick('保存', 'Save'),
    saving: pick('保存中...', 'Saving...'),
    saved: pick('已保存', 'Saved'),
    cancel: pick('关闭', 'Close'),
    providerCustom: pick('自定义', 'Custom'),
    providerHint: pick(
      '★ 生成时使用的默认服务商 · ● 已保存 API Key · ✓ 已保存配置。保存只更新当前服务商，设为默认才切换生成用的服务商。',
      '★ default provider used for generation · ● API key saved · ✓ configuration saved. Saving updates the current provider only; use "Set as default" to switch the provider used for generation.'
    ),
    setAsDefault: pick('设为默认', 'Set as default'),
    providerSavedMark: pick('已保存该服务商配置', 'Provider configuration saved'),
    keySavedForCurrent: pick('该地址已保存 Key', 'A key is saved for this endpoint'),
    keyMissingForCurrent: pick('该地址尚未保存 Key', 'No key saved for this endpoint'),
    importConfig: pick('导入配置', 'Import'),
    exportConfig: pick('导出配置', 'Export'),
  };
}

export function inferLanguage(): string {
  return isChinese() ? 'Chinese' : 'English';
}
