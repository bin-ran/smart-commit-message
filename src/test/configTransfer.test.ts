import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { buildTransferFile, parseTransferFile, TRANSFER_VERSION, type TransferSettings } from '../configTransfer';

const settings: TransferSettings = {
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-v4-flash',
  style: 'conventional',
  language: 'Chinese',
  maxDiffChars: 8000,
  customPrompt: '',
};

test('buildTransferFile 生成带版本号的配置快照', () => {
  const file = buildTransferFile(settings);

  assert.equal(file.version, TRANSFER_VERSION);
  assert.equal(file.settings.baseUrl, 'https://api.deepseek.com');
  assert.equal(file.apiKeys, undefined, '默认不导出 Key');
  assert.match(file.exportedAt ?? '', /^\d{4}-\d{2}-\d{2}T/);
});

test('buildTransferFile 仅在显式传入时导出非空 Key', () => {
  const file = buildTransferFile(settings, { deepseek: ' sk-1 ', glm: '   ', custom: 'x' });

  assert.deepEqual(file.apiKeys, { deepseek: 'sk-1', custom: 'x' });
});

test('导出后再导入可还原设置', () => {
  const file = buildTransferFile(settings, { mimo: 'sk-mimo' });
  const result = parseTransferFile(JSON.stringify(file));

  assert.ok('file' in result);
  assert.deepEqual(result.file.settings, settings);
  assert.deepEqual(result.file.apiKeys, { mimo: 'sk-mimo' });
});

test('解析失败时返回错误码', () => {
  assert.deepEqual(parseTransferFile('{oops'), { error: 'invalid-json' });
  assert.deepEqual(parseTransferFile('[]'), { error: 'invalid-settings' });
  assert.deepEqual(parseTransferFile(JSON.stringify({ version: 99, settings })), { error: 'unsupported-version' });
});

test('拒绝非法或明文 baseUrl', () => {
  const httpFile = { version: TRANSFER_VERSION, settings: { ...settings, baseUrl: 'http://api.example.com' } };
  assert.deepEqual(parseTransferFile(JSON.stringify(httpFile)), { error: 'insecure-base-url' });

  const brokenFile = { version: TRANSFER_VERSION, settings: { ...settings, baseUrl: 'not-a-url' } };
  assert.deepEqual(parseTransferFile(JSON.stringify(brokenFile)), { error: 'invalid-base-url' });
});

test('拒绝非法字段取值', () => {
  const cases: Array<[Record<string, unknown>, string]> = [
    [{ ...settings, model: '  ' }, 'invalid-model'],
    [{ ...settings, style: 'fancy' }, 'invalid-style'],
    [{ ...settings, language: 'Japanese' }, 'invalid-language'],
    [{ ...settings, maxDiffChars: 10 }, 'invalid-max-diff-chars'],
    [{ ...settings, maxDiffChars: '8000' }, 'invalid-max-diff-chars'],
  ];

  for (const [rawSettings, expected] of cases) {
    const raw = JSON.stringify({ version: TRANSFER_VERSION, settings: rawSettings });
    assert.deepEqual(parseTransferFile(raw), { error: expected }, JSON.stringify(rawSettings));
  }
});

test('拒绝非字符串 Key，并忽略空 Key', () => {
  const bad = JSON.stringify({ version: TRANSFER_VERSION, settings, apiKeys: { deepseek: 123 } });
  assert.deepEqual(parseTransferFile(bad), { error: 'invalid-api-keys' });

  const ok = JSON.stringify({ version: TRANSFER_VERSION, settings, apiKeys: { deepseek: 'sk-1', glm: '  ' } });
  const result = parseTransferFile(ok);
  assert.ok('file' in result);
  assert.deepEqual(result.file.apiKeys, { deepseek: 'sk-1' });
});

test('未知字段不会进入设置', () => {
  const raw = JSON.stringify({ version: TRANSFER_VERSION, settings: { ...settings, unknownSetting: 'x' }, extra: 1 });
  const result = parseTransferFile(raw);

  assert.ok('file' in result);
  assert.deepEqual(Object.keys(result.file.settings).sort(), [
    'baseUrl',
    'customPrompt',
    'language',
    'maxDiffChars',
    'model',
    'style',
  ]);
});
