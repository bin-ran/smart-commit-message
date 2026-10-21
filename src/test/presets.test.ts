import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { CUSTOM_PROVIDER_ID, findProviderByBaseUrl, keySlotForBaseUrl, normalizeBaseUrl, PROVIDER_PRESETS, resolveProviderSelection } from '../presets';

test('findProviderByBaseUrl 忽略大小写与结尾斜杠', () => {
  assert.equal(findProviderByBaseUrl('https://api.deepseek.com').id, 'deepseek');
  assert.equal(findProviderByBaseUrl('HTTPS://API.DEEPSEEK.COM/').id, 'deepseek');
  assert.equal(findProviderByBaseUrl('https://open.bigmodel.cn/api/paas/v4/').id, 'glm');
});

test('findProviderByBaseUrl 对未知地址回落到自定义预设', () => {
  assert.equal(findProviderByBaseUrl('https://my-gateway.example.com/v1').id, CUSTOM_PROVIDER_ID);
  assert.equal(findProviderByBaseUrl('http://localhost:11434/v1').id, CUSTOM_PROVIDER_ID);
  assert.equal(findProviderByBaseUrl('').id, CUSTOM_PROVIDER_ID);
});

test('resolveProviderSelection 返回预设的 baseUrl 与首个候选模型', () => {
  assert.deepEqual(resolveProviderSelection('deepseek'), {
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
  });
  assert.deepEqual(resolveProviderSelection('mimo'), {
    baseUrl: 'https://api.xiaomimimo.com/v1',
    model: 'mimo-v2.6-flash',
  });
});

test('resolveProviderSelection 对自定义或未知 id 返回 undefined', () => {
  assert.equal(resolveProviderSelection(CUSTOM_PROVIDER_ID), undefined);
  assert.equal(resolveProviderSelection('unknown'), undefined);
});

test('预设包含 DeepSeek / GLM / Qwen / MiMo，且自定义排在最后', () => {
  assert.deepEqual(
    PROVIDER_PRESETS.map((preset) => preset.id),
    ['deepseek', 'glm', 'qwen', 'mimo', CUSTOM_PROVIDER_ID]
  );
  for (const preset of PROVIDER_PRESETS) {
    if (preset.id !== CUSTOM_PROVIDER_ID) {
      assert.ok(preset.baseUrl.startsWith('https://'), `${preset.id} should use https`);
      assert.ok(preset.models.length > 0, `${preset.id} should have model candidates`);
    }
  }
});

test('normalizeBaseUrl 去掉协议、大小写与结尾斜杠', () => {
  assert.equal(normalizeBaseUrl('HTTPS://API.DeepSeek.com/'), 'api.deepseek.com');
  assert.equal(normalizeBaseUrl('https://open.bigmodel.cn/api/paas/v4/'), 'open.bigmodel.cn/api/paas/v4');
  assert.equal(normalizeBaseUrl('not a url'), 'not a url');
});

test('keySlotForBaseUrl 预设命中时用预设 id', () => {
  assert.equal(keySlotForBaseUrl('https://api.deepseek.com'), 'deepseek');
  assert.equal(keySlotForBaseUrl('https://open.bigmodel.cn/api/paas/v4/'), 'glm');
  assert.equal(keySlotForBaseUrl('https://dashscope.aliyuncs.com/compatible-mode/v1'), 'qwen');
  assert.equal(keySlotForBaseUrl('https://api.xiaomimimo.com/v1'), 'mimo');
});

test('keySlotForBaseUrl 自定义网关按 host+path 分槽，且与协议无关', () => {
  assert.equal(keySlotForBaseUrl('https://gw.example.com/v1'), 'custom:gw.example.com/v1');
  assert.equal(keySlotForBaseUrl('http://localhost:11434/v1'), 'custom:localhost:11434/v1');
  assert.equal(
    keySlotForBaseUrl('http://gw.example.com/v1'),
    keySlotForBaseUrl('https://gw.example.com/v1/'),
    '同一网关（仅协议/斜杠不同）应落在同一槽位'
  );
  assert.notEqual(keySlotForBaseUrl('https://gw.example.com/v1'), keySlotForBaseUrl('https://gw.example.com/v2'));
});
