import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { checkBaseUrl } from '../url';

test('https 地址通过校验', () => {
  assert.equal(checkBaseUrl('https://api.deepseek.com'), undefined);
  assert.equal(checkBaseUrl('https://api.deepseek.com/v1'), undefined);
});

test('回环地址允许明文 http', () => {
  assert.equal(checkBaseUrl('http://localhost:11434/v1'), undefined);
  assert.equal(checkBaseUrl('http://127.0.0.1:8080'), undefined);
  assert.equal(checkBaseUrl('http://[::1]:3000'), undefined);
});

test('非回环地址的明文 http 被拒绝', () => {
  assert.deepEqual(checkBaseUrl('http://api.example.com'), { kind: 'insecure', baseUrl: 'http://api.example.com' });
  assert.deepEqual(checkBaseUrl('ftp://api.example.com'), { kind: 'insecure', baseUrl: 'ftp://api.example.com' });
});

test('非法 URL 与带凭据的 URL 被拒绝', () => {
  assert.deepEqual(checkBaseUrl('not a url'), { kind: 'invalid', baseUrl: 'not a url' });
  assert.deepEqual(checkBaseUrl(''), { kind: 'invalid', baseUrl: '' });
  assert.deepEqual(checkBaseUrl('https://user:pass@api.example.com'), {
    kind: 'invalid',
    baseUrl: 'https://user:pass@api.example.com',
  });
});
