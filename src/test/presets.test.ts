import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { CUSTOM_PROVIDER_ID, findProviderByBaseUrl, PROVIDER_PRESETS, resolveProviderSelection } from '../presets';

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
