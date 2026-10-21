export interface ProviderPreset {
  id: string;
  label: string;
  baseUrl: string;
  models: string[];
}

export const CUSTOM_PROVIDER_ID = 'custom';

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'glm',
    label: 'GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-5.3', 'glm-4.6', 'glm-4-plus'],
  },
  {
    id: 'qwen',
    label: 'Qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-max', 'qwen-plus', 'qwen3-coder-plus'],
  },
  {
    id: 'mimo',
    label: 'MiMo',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    models: ['mimo-v2.6-flash', 'mimo-v2.6-pro', 'mimo-v2.6-pro-ultraspeed'],
  },
  {
    id: CUSTOM_PROVIDER_ID,
    label: 'Custom',
    baseUrl: '',
    models: [],
  },
];

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '').toLowerCase();
}

// 用当前 baseUrl 反查预设，用于面板初始选中态；对不上就落到“自定义”
export function findProviderByBaseUrl(baseUrl: string, presets: ProviderPreset[] = PROVIDER_PRESETS): ProviderPreset {
  const normalized = normalizeUrl(baseUrl);
  const matched = presets.find((preset) => preset.id !== CUSTOM_PROVIDER_ID && normalized !== '' && normalizeUrl(preset.baseUrl) === normalized);
  return matched ?? presets[presets.length - 1];
}

// 选中预设时填充的 baseUrl 与首个候选模型；自定义返回 undefined，保留用户已填内容
export function resolveProviderSelection(
  providerId: string,
  presets: ProviderPreset[] = PROVIDER_PRESETS
): { baseUrl: string; model: string } | undefined {
  const preset = presets.find((item) => item.id === providerId);
  if (!preset || preset.id === CUSTOM_PROVIDER_ID) {
    return undefined;
  }
  return { baseUrl: preset.baseUrl, model: preset.models[0] ?? '' };
}
