import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { getDiff, GitError, truncateDiff } from '../git';

function createRepo(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'scm-git-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  execFileSync('git', ['config', 'core.autocrlf', 'false'], { cwd: dir });
  return dir;
}

function commitAll(dir: string): void {
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-qm', 'init'], { cwd: dir });
}

function buildDiffSection(name: string, lineCount: number): string {
  const lines = Array.from({ length: lineCount }, (_, index) => `+line${index}`);
  return [`diff --git a/${name} b/${name}`, `--- a/${name}`, `+++ b/${name}`, `@@ -1,1 +1,${lineCount} @@`, ...lines].join('\n');
}

test('truncateDiff 在预算内原样返回', () => {
  const diff = buildDiffSection('a.ts', 3);
  assert.equal(truncateDiff(diff, diff.length + 1), diff);
});

test('truncateDiff 按文件整段丢弃并标注剩余数量', () => {
  const diff = [buildDiffSection('a.ts', 3), buildDiffSection('b.ts', 2), buildDiffSection('c.ts', 1)].join('\n');
  const truncated = truncateDiff(diff, buildDiffSection('a.ts', 3).length + 1);

  assert.ok(truncated.includes('a.ts'));
  assert.ok(!truncated.includes('b.ts'));
  assert.ok(!truncated.includes('c.ts'));
  assert.ok(truncated.endsWith('(2 more changed file(s) omitted)'));
});

test('truncateDiff 在单个文件超预算时保留文件头并按行截断', () => {
  const diff = buildDiffSection('big.ts', 100);
  const truncated = truncateDiff(diff, 120);

  assert.ok(truncated.startsWith('diff --git a/big.ts b/big.ts'));
  assert.ok(truncated.includes('@@ -1,1 +1,100 @@'));
  assert.ok(truncated.endsWith('... (file truncated)'));
  assert.ok(!truncated.includes('+line99'));
});

test('getDiff 同时包含已暂存与未暂存的改动', async () => {
  const dir = createRepo();
  writeFileSync(path.join(dir, 'a.txt'), 'first\n');
  commitAll(dir);

  writeFileSync(path.join(dir, 'a.txt'), 'first\nsecond\n');
  execFileSync('git', ['add', 'a.txt'], { cwd: dir });
  appendFileSync(path.join(dir, 'a.txt'), 'third\n');

  const diff = await getDiff(dir);
  assert.ok(diff.includes('+second'));
  assert.ok(diff.includes('+third'));
});

test('getDiff 纳入未跟踪的新文件', async () => {
  const dir = createRepo();
  writeFileSync(path.join(dir, 'seed.txt'), 'seed\n');
  commitAll(dir);
  writeFileSync(path.join(dir, 'brand-new.ts'), 'export const a = 1;\n');

  const diff = await getDiff(dir);
  assert.ok(diff.includes('diff --git a/brand-new.ts b/brand-new.ts'));
  assert.ok(diff.includes('+export const a = 1;'));
});

test('getDiff 跳过未跟踪的二进制文件内容', async () => {
  const dir = createRepo();
  writeFileSync(path.join(dir, 'seed.txt'), 'seed\n');
  commitAll(dir);
  writeFileSync(path.join(dir, 'logo.bin'), Buffer.from([0, 1, 2, 3]));

  const diff = await getDiff(dir);
  assert.ok(diff.includes('logo.bin'));
  assert.ok(diff.includes('(binary file content omitted)'));
});

test('getDiff 在没有改动时返回空字符串', async () => {
  const dir = createRepo();
  writeFileSync(path.join(dir, 'a.txt'), 'first\n');
  commitAll(dir);

  assert.equal(await getDiff(dir), '');
});

test('getDiff 在非仓库目录抛出 GitError', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'scm-norepo-'));
  await assert.rejects(() => getDiff(dir), (error: unknown) => {
    assert.ok(error instanceof GitError);
    assert.match(error.detail, /not a git repository/);
    return true;
  });
});
