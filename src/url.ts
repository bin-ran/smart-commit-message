const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export type BaseUrlProblem =
  | { kind: 'invalid'; baseUrl: string }
  | { kind: 'insecure'; baseUrl: string };

// 纯校验逻辑，不依赖 vscode，方便单测：https 或 localhost 明文 http 才算合规。
export function checkBaseUrl(baseUrl: string): BaseUrlProblem | undefined {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return { kind: 'invalid', baseUrl };
  }

  if (url.username || url.password) {
    return { kind: 'invalid', baseUrl };
  }
  if (url.protocol === 'https:') {
    return undefined;
  }
  if (url.protocol === 'http:' && LOOPBACK_HOSTS.includes(url.hostname)) {
    return undefined;
  }
  return { kind: 'insecure', baseUrl };
}
