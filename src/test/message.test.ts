import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { sanitizeCommitMessage } from '../message';

test('普通文本原样返回（仅去首尾空白）', () => {
  assert.equal(sanitizeCommitMessage('  feat(panel): 新增配置面板  '), 'feat(panel): 新增配置面板');
});

test('剥掉代码围栏', () => {
  assert.equal(sanitizeCommitMessage('```\nfeat: add thing\n```'), 'feat: add thing');
  assert.equal(sanitizeCommitMessage('```markdown\nfeat: add thing\n```'), 'feat: add thing');
  assert.equal(sanitizeCommitMessage('```"feat: add thing"```'), 'feat: add thing');
});

test('剥掉包裹引号与加粗', () => {
  assert.equal(sanitizeCommitMessage('"feat: add thing"'), 'feat: add thing');
  assert.equal(sanitizeCommitMessage('“feat: add thing”'), 'feat: add thing');
  assert.equal(sanitizeCommitMessage('**feat: add thing**'), 'feat: add thing');
});

test('剥掉前置引导语', () => {
  const input = 'Here is a commit message following the Conventional Commits spec:\n\nfeat(panel): 新增配置面板';
  assert.equal(sanitizeCommitMessage(input), 'feat(panel): 新增配置面板');
  assert.equal(sanitizeCommitMessage("Sure! Here's the commit message\nfeat: x"), 'feat: x');
});

test('正文里的 Here is 不会被误删', () => {
  const input = 'feat: add docs\n\nHere is why the change matters: it unblocks users.';
  assert.equal(sanitizeCommitMessage(input), input);
});

test('压缩多余空行与行尾空白', () => {
  assert.equal(sanitizeCommitMessage('feat: x   \n\n\n\nbody line   \n'), 'feat: x\n\nbody line');
});

test('统一 CRLF', () => {
  assert.equal(sanitizeCommitMessage('feat: x\r\n\r\nbody'), 'feat: x\n\nbody');
});

test('空输入返回空串', () => {
  assert.equal(sanitizeCommitMessage(''), '');
  assert.equal(sanitizeCommitMessage('   \n  '), '');
  assert.equal(sanitizeCommitMessage('```\n```'), '');
});
