import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';

const MAX_BUFFER = 10 * 1024 * 1024;
const MAX_UNTRACKED_FILES = 20;
const MAX_UNTRACKED_FILE_BYTES = 100 * 1024;
const BINARY_SNIFF_BYTES = 8000;
export const DEFAULT_MAX_DIFF_CHARS = 8000;

export class GitError extends Error {
  constructor(readonly detail: string) {
    super(detail);
    this.name = 'GitError';
  }
}

function execGit(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, encoding: 'utf-8', maxBuffer: MAX_BUFFER, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        const detail = (stderr || error.message || '').trim().slice(0, 500);
        reject(new GitError(detail));
        return;
      }
      resolve(stdout);
    });
  });
}

async function hasHeadCommit(cwd: string): Promise<boolean> {
  try {
    await execGit(cwd, ['rev-parse', '--verify', 'HEAD']);
    return true;
  } catch {
    return false;
  }
}

// 优先用 git diff HEAD 拿到已暂存 + 未暂存的全部改动；仓库还没有提交时
// HEAD 不存在，退化为只看暂存区。
async function getTrackedDiff(cwd: string): Promise<string> {
  if (await hasHeadCommit(cwd)) {
    return execGit(cwd, ['diff', '--no-color', '--find-renames', 'HEAD']);
  }
  return execGit(cwd, ['diff', '--cached', '--no-color']);
}

function newFileHeader(relativePath: string): string {
  return `diff --git a/${relativePath} b/${relativePath}\nnew file mode 100644\n--- /dev/null\n+++ b/${relativePath}`;
}

async function buildNewFileChunk(cwd: string, relativePath: string): Promise<string | undefined> {
  const absolutePath = path.join(cwd, relativePath);
  const stat = await fs.stat(absolutePath).catch(() => undefined);
  if (!stat?.isFile()) {
    return undefined;
  }

  const header = newFileHeader(relativePath);
  if (stat.size > MAX_UNTRACKED_FILE_BYTES) {
    return `${header}\n(new file content omitted: ${stat.size} bytes)`;
  }

  const buffer = await fs.readFile(absolutePath);
  if (buffer.subarray(0, BINARY_SNIFF_BYTES).includes(0)) {
    return `${header}\n(binary file content omitted)`;
  }

  let content = buffer.toString('utf-8');
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  const lines = content.split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  if (lines.length === 0) {
    return `${header}\n(empty file)`;
  }

  return `${header}\n@@ -0,0 +1,${lines.length} @@\n${lines.map((line) => `+${line}`).join('\n')}`;
}

// git diff 与 git diff --cached 都不包含未跟踪文件，新增文件必须单独补进来，
// 否则生成的信息会漏掉改动主体。
async function getUntrackedDiff(cwd: string): Promise<string> {
  const output = await execGit(cwd, ['ls-files', '--others', '--exclude-standard', '-z']);
  const files = output.split('\0').filter((file) => file.length > 0);
  const chunks: string[] = [];

  for (const file of files.slice(0, MAX_UNTRACKED_FILES)) {
    const chunk = await buildNewFileChunk(cwd, file);
    if (chunk) {
      chunks.push(chunk);
    }
  }

  if (files.length > MAX_UNTRACKED_FILES) {
    chunks.push(`(${files.length - MAX_UNTRACKED_FILES} more new files omitted)`);
  }

  return chunks.join('\n');
}

export async function getDiff(cwd: string): Promise<string> {
  // 预检：非仓库目录下 git diff 会退化成 --no-index 模式并吐一屏 usage，
  // 先用 rev-parse 拿到“not a git repository”这类清晰错误。
  await execGit(cwd, ['rev-parse', '--is-inside-work-tree']);

  const trackedDiff = await getTrackedDiff(cwd);
  const untrackedDiff = await getUntrackedDiff(cwd);
  return [trackedDiff, untrackedDiff].filter((part) => part.trim().length > 0).join('\n').trim();
}

export function truncateDiff(diff: string, maxChars: number = DEFAULT_MAX_DIFF_CHARS): string {
  if (diff.length <= maxChars) {
    return diff;
  }

  const sections = splitIntoSections(diff);
  const kept: string[] = [];
  let used = 0;

  for (const section of sections) {
    if (used + section.length + 1 > maxChars) {
      break;
    }
    kept.push(section);
    used += section.length + 1;
  }

  // 单个文件就超预算时只截断该文件内部，保留文件头以便模型知道改了哪个文件
  if (kept.length === 0) {
    const head = truncateSection(sections[0] ?? diff, maxChars);
    const rest = sections.length > 1 ? `\n\n... (${sections.length - 1} more changed file(s) omitted)` : '';
    return head + rest;
  }

  const omitted = sections.length - kept.length;
  if (omitted === 0) {
    return `${kept.join('\n')}\n\n... (diff truncated)`;
  }
  return `${kept.join('\n')}\n\n... (${omitted} more changed file(s) omitted)`;
}

// 按 diff --git 分成文件段，截断时整段丢弃，避免切碎 hunk 让模型误判改动范围。
function splitIntoSections(diff: string): string[] {
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ') && current.length > 0) {
      sections.push(current.join('\n'));
      current = [];
    }
    current.push(line);
  }
  if (current.length > 0) {
    sections.push(current.join('\n'));
  }
  return sections;
}

function cutAtLineBoundary(text: string, maxChars: number): string {
  const sliced = text.slice(0, maxChars);
  const lastNewline = sliced.lastIndexOf('\n');
  return lastNewline > 0 ? sliced.slice(0, lastNewline) : sliced;
}

function truncateSection(section: string, maxChars: number): string {
  return `${cutAtLineBoundary(section, maxChars)}\n... (file truncated)`;
}
