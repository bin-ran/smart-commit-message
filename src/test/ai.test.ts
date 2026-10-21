import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { ApiError, generateCommitMessage } from '../ai';
import type { Config } from '../config';

type Route = 'ok' | 'slow' | 'bad-gateway' | 'not-json' | 'empty' | 'error-field';

function buildConfig(port: number, model = 'test-model'): Config {
  return {
    apiKey: 'sk-test',
    baseUrl: `http://127.0.0.1:${port}/v1`,
    model,
    style: 'conventional',
    language: 'English',
    customPrompt: '',
    maxDiffChars: 8000,
  };
}

async function startServer(): Promise<{ server: Server; port: number; lastBody: () => string; lastAuth: () => string }> {
  let body = '';
  let auth = '';
  const server = createServer((request, response) => {
    const segments = (request.url ?? '').split('/').filter((part) => part.length > 0);
    const route = (segments[1] ?? 'ok') as Route;
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      auth = String(request.headers.authorization ?? '');

      if (route === 'slow') {
        setTimeout(() => {
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ choices: [{ message: { content: 'feat: slow' } }] }));
        }, 300);
        return;
      }
      if (route === 'bad-gateway') {
        response.writeHead(502, { 'Content-Type': 'text/html' });
        response.end('<html>bad gateway</html>');
        return;
      }
      if (route === 'not-json') {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end('<html>not json</html>');
        return;
      }
      if (route === 'empty') {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ choices: [{ message: { content: '   ' } }] }));
        return;
      }
      if (route === 'error-field') {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: { message: 'invalid api key' } }));
        return;
      }

      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ choices: [{ message: { content: '  feat(core): add thing  ' } }] }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return { server, port, lastBody: () => body, lastAuth: () => auth };
}

async function withServer(run: (ctx: { port: number; lastBody: () => string; lastAuth: () => string }) => Promise<void>): Promise<void> {
  const { server, port, lastBody, lastAuth } = await startServer();
  try {
    await run({ port, lastBody, lastAuth });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function expectApiError(promise: Promise<unknown>, kind: string): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof ApiError, `expected ApiError, got ${String(error)}`);
    assert.equal(error.kind, kind);
    return true;
  });
}

test('generateCommitMessage 返回去掉首尾空白的 Commit 信息', async () => {
  await withServer(async ({ port }) => {
    const message = await generateCommitMessage('diff --git a/x b/x', buildConfig(port));
    assert.equal(message, 'feat(core): add thing');
  });
});

test('generateCommitMessage 以 Bearer 方式带上 API Key 并传 model', async () => {
  await withServer(async ({ port, lastBody, lastAuth }) => {
    await generateCommitMessage('diff', buildConfig(port, 'my-model'));
    assert.equal(lastAuth(), 'Bearer sk-test');
    assert.equal(JSON.parse(lastBody()).model, 'my-model');
  });
});

test('generateCommitMessage 在 502 时抛出 http 错误', async () => {
  await withServer(async ({ port, lastBody }) => {
    const cfg = { ...buildConfig(port), baseUrl: `http://127.0.0.1:${port}/v1/bad-gateway` };
    await expectApiError(generateCommitMessage('diff', cfg), 'http');
    assert.ok(lastBody().length > 0);
  });
});

test('generateCommitMessage 在响应不是 JSON 时抛出 invalid-response', async () => {
  await withServer(async ({ port }) => {
    const cfg = { ...buildConfig(port), baseUrl: `http://127.0.0.1:${port}/v1/not-json` };
    await expectApiError(generateCommitMessage('diff', cfg), 'invalid-response');
  });
});

test('generateCommitMessage 在内容为空时抛出 empty-response', async () => {
  await withServer(async ({ port }) => {
    const cfg = { ...buildConfig(port), baseUrl: `http://127.0.0.1:${port}/v1/empty` };
    await expectApiError(generateCommitMessage('diff', cfg), 'empty-response');
  });
});

test('generateCommitMessage 在响应含 error 字段时抛出 http 错误', async () => {
  await withServer(async ({ port }) => {
    const cfg = { ...buildConfig(port), baseUrl: `http://127.0.0.1:${port}/v1/error-field` };
    await expectApiError(generateCommitMessage('diff', cfg), 'http');
  });
});

test('generateCommitMessage 在超时时抛出 timeout', async () => {
  await withServer(async ({ port }) => {
    const cfg = { ...buildConfig(port), baseUrl: `http://127.0.0.1:${port}/v1/slow` };
    await expectApiError(generateCommitMessage('diff', cfg, { timeoutMs: 50 }), 'timeout');
  });
});

test('generateCommitMessage 在外部取消时抛出 cancelled', async () => {
  await withServer(async ({ port }) => {
    const controller = new AbortController();
    const cfg = { ...buildConfig(port), baseUrl: `http://127.0.0.1:${port}/v1/slow` };
    const promise = generateCommitMessage('diff', cfg, { signal: controller.signal });
    setTimeout(() => controller.abort(), 50);
    await expectApiError(promise, 'cancelled');
  });
});
