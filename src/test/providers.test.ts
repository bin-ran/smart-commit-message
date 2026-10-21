import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { findProviderConfigForBaseUrl, normalizeProviderMap, resolveActiveProvider, upsertProviderConfig } from '../providers';

const fallback = { baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash' };

test('normalizeProviderMap 丢弃残缺条目', () => {
  const map = normalizeProviderMap({
    deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
    broken: { baseUrl: 'https://x.com' },
    empty: {},
    '': { baseUrl: 'https://y.com', model: 'm' },
    weird: 'nope',
  });

  assert.deepEqual(Object.keys(map), ['deepseek']);
});

test('normalizeProviderMap 处理非对象输入', () => {
  assert.deepEqual(normalizeProviderMap(undefined), {});
  assert.deepEqual(normalizeProviderMap([]), {});
  assert.deepEqual(normalizeProviderMap('x'), {});
});

test('upsertProviderConfig 按 baseUrl 推导槽位', () => {
  const map = upsertProviderConfig({}, 'https://open.bigmodel.cn/api/paas/v4', 'glm-5.3');
  assert.deepEqual(map, { glm: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-5.3' } });

  const custom = upsertProviderConfig({}, 'https://gw.example.com/v1', 'my-model');
  assert.deepEqual(Object.keys(custom), ['custom:gw.example.com/v1']);
});

test('resolveActiveProvider 优先使用默认槽位', () => {
  const map = { glm: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-5.3' } };
  const active = resolveActiveProvider(map, 'glm', fallback);

  assert.deepEqual(active, { slot: 'glm', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-5.3' });
});

test('resolveActiveProvider 在默认槽位缺失时回退到旧设置', () => {
  const active = resolveActiveProvider({}, 'glm', fallback);

  assert.deepEqual(active, { slot: 'deepseek', baseUrl: fallback.baseUrl, model: fallback.model });
  assert.deepEqual(resolveActiveProvider({}, '', fallback).slot, 'deepseek');
});

test('findProviderConfigForBaseUrl 忽略协议与结尾斜杠', () => {
  const map = upsertProviderConfig({}, 'https://gw.example.com/v1', 'my-model');

  assert.deepEqual(findProviderConfigForBaseUrl(map, 'http://gw.example.com/v1/'), { baseUrl: 'https://gw.example.com/v1', model: 'my-model' });
  assert.equal(findProviderConfigForBaseUrl(map, 'https://other.example.com/v1'), undefined);
});
