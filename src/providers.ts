import { keySlotForBaseUrl } from './presets';

export interface ProviderConfig {
  baseUrl: string;
  model: string;
}

export type ProviderConfigMap = Record<string, ProviderConfig>;

export interface ActiveProvider extends ProviderConfig {
  slot: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// settings 里的 providers 是用户可手改的 JSON，读取时逐项过滤
export function normalizeProviderMap(raw: unknown): ProviderConfigMap {
  if (!isRecord(raw)) {
    return {};
  }

  const map: ProviderConfigMap = {};
  for (const [slot, value] of Object.entries(raw)) {
    if (!slot.trim() || !isRecord(value)) {
      continue;
    }
    const baseUrl = typeof value.baseUrl === 'string' ? value.baseUrl.trim() : '';
    const model = typeof value.model === 'string' ? value.model.trim() : '';
    if (!baseUrl || !model) {
      continue;
    }
    map[slot] = { baseUrl, model };
  }
  return map;
}

// 保存某个服务商时按 baseUrl 推导槽位，与 Key 槽位保持一致
export function upsertProviderConfig(map: ProviderConfigMap, baseUrl: string, model: string): ProviderConfigMap {
  const trimmedUrl = baseUrl.trim();
  return { ...map, [keySlotForBaseUrl(trimmedUrl)]: { baseUrl: trimmedUrl, model: model.trim() } };
}

// 生成时使用的服务商：默认槽位有配置就用它，否则回退到旧的 baseUrl/model 设置
export function resolveActiveProvider(
  map: ProviderConfigMap,
  defaultSlot: string,
  fallback: ProviderConfig
): ActiveProvider {
  const saved = defaultSlot ? map[defaultSlot] : undefined;
  if (saved) {
    return { slot: defaultSlot, ...saved };
  }
  return { slot: keySlotForBaseUrl(fallback.baseUrl), ...fallback };
}

export function findProviderConfigForBaseUrl(map: ProviderConfigMap, baseUrl: string): ProviderConfig | undefined {
  return map[keySlotForBaseUrl(baseUrl)];
}
