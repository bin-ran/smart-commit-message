import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { ApiError, generateCommitMessage, listModels, probeConnection } from '../ai';
import type { Config } from '../config';

interface TestServer {
  server: Server;
  port: number;
  lastBody: () => string;
  lastAuth: () => string;
  lastUrl: () => string;
}

// 第一段是场景，第二段是资源（models / chat），例如 /v1/models-404/models
function routeOf(url: string): { scope: string; resource: string } {
  const segments = url.split('/').filter((part) => part.length > 0);
  return { scope: segments[1] ?? 'ok', resource: segments[2] ?? '' };
}

function buildConfig(port: number, scope = 'ok', model = 'test-model'): Config {
  return {
    apiKey: 'sk-test',
    baseUrl: `http://127.0.0.1:${port}/v1/${scope}`,
    model,
    style: 'conventional',
    language: 'English',
    customPrompt: '',
    maxDiffChars: 8000,
  };
}

async function startServer(): Promise<TestServer> {
  let body = '';
  let auth = '';
  let url = '';

  const server = createServer((request, response) => {
    const { scope, resource } = routeOf(request.url ?? '');
    url = request.url ?? '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      auth = String(request.headers.authorization ?? '');

      const json = (payload: unknown) => {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(payload));
      };

      if (scope === 'slow') {
        setTimeout(() => json({ choices: [{ message: { content: 'feat: slow' } }] }), 300);
        return;
      }
      if (scope === 'bad-gateway') {
        response.writeHead(502, { 'Content-Type': 'text/html' });
        response.end('<html>bad gateway</html>');
        return;
      }
      if (scope === 'not-json') {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end('<html>not json</html>');
        return;
      }
      if (scope === 'empty') {
        json({ choices: [{ message: { content: '   ' } }] });
        return;
      }
      if (scope === 'error-field') {
        json({ error: { message: 'invalid api key' } });
        return;
      }
      if (scope === 'models-404' && resource === 'models') {
        response.writeHead(404, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: { message: 'not found' } }));
        return;
      }
      if (scope === 'models-empty' && resource === 'models') {
        json({ data: [] });
        return;
      }
      if (resource === 'models') {
        json({ data: [{ id: 'b-model' }, { id: 'a-model' }, { id: 'a-model' }] });
        return;
      }

      json({ choices: [{ message: { content: '  feat(core): add thing  ' } }] });
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  return { server, port, lastBody: () => body, lastAuth: () => auth, lastUrl: () => url };
}

async function withServer(run: (ctx: TestServer) => Promise<void>): Promise<void> {
  const testServer = await startServer();
  try {
    await run(testServer);
  } finally {
    await new Promise<void>((resolve) => testServer.server.close(() => resolve()));
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
    await generateCommitMessage('diff', buildConfig(port, 'ok', 'my-model'));
    assert.equal(lastAuth(), 'Bearer sk-test');
    assert.equal(JSON.parse(lastBody()).model, 'my-model');
  });
});

test('generateCommitMessage 在 502 时抛出 http 错误', async () => {
  await withServer(async ({ port }) => {
    await expectApiError(generateCommitMessage('diff', buildConfig(port, 'bad-gateway')), 'http');
  });
});

test('generateCommitMessage 在响应不是 JSON 时抛出 invalid-response', async () => {
  await withServer(async ({ port }) => {
    await expectApiError(generateCommitMessage('diff', buildConfig(port, 'not-json')), 'invalid-response');
  });
});

test('generateCommitMessage 在内容为空时抛出 empty-response', async () => {
  await withServer(async ({ port }) => {
    await expectApiError(generateCommitMessage('diff', buildConfig(port, 'empty')), 'empty-response');
  });
});

test('generateCommitMessage 在响应含 error 字段时抛出 http 错误', async () => {
  await withServer(async ({ port }) => {
    await expectApiError(generateCommitMessage('diff', buildConfig(port, 'error-field')), 'http');
  });
});

test('generateCommitMessage 在超时时抛出 timeout', async () => {
  await withServer(async ({ port }) => {
    await expectApiError(generateCommitMessage('diff', buildConfig(port, 'slow'), { timeoutMs: 50 }), 'timeout');
  });
});

test('generateCommitMessage 在外部取消时抛出 cancelled', async () => {
  await withServer(async ({ port }) => {
    const controller = new AbortController();
    const promise = generateCommitMessage('diff', buildConfig(port, 'slow'), { signal: controller.signal });
    setTimeout(() => controller.abort(), 50);
    await expectApiError(promise, 'cancelled');
  });
});

test('listModels 请求 /models 并去重排序', async () => {
  await withServer(async ({ port, lastUrl, lastAuth }) => {
    const models = await listModels(buildConfig(port));
    assert.deepEqual(models, ['a-model', 'b-model']);
    assert.match(lastUrl(), /\/v1\/ok\/models$/);
    assert.equal(lastAuth(), 'Bearer sk-test');
  });
});

test('listModels 在服务端返回空列表时抛出 empty-response', async () => {
  await withServer(async ({ port }) => {
    await expectApiError(listModels(buildConfig(port, 'models-empty')), 'empty-response');
  });
});

test('probeConnection 在 /models 可用时直接返回模型列表', async () => {
  await withServer(async ({ port }) => {
    const result = await probeConnection(buildConfig(port));
    assert.equal(result.viaModelsApi, true);
    assert.deepEqual(result.models, ['a-model', 'b-model']);
    assert.ok(result.elapsedMs >= 0);
  });
});

test('probeConnection 在 /models 返回 404 时退回 chat 请求', async () => {
  await withServer(async ({ port, lastUrl, lastBody }) => {
    const result = await probeConnection(buildConfig(port, 'models-404', 'fallback-model'));
    assert.equal(result.viaModelsApi, false);
    assert.deepEqual(result.models, []);
    assert.match(lastUrl(), /\/v1\/models-404\/chat\/completions$/);
    assert.equal(JSON.parse(lastBody()).model, 'fallback-model');
  });
});
