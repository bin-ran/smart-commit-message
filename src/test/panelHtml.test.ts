import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import type * as vscode from 'vscode';
import { renderPanelHtml } from '../panelHtml';

function fakeWebview(): vscode.Webview {
  return { cspSource: 'vscode-webview://test' } as unknown as vscode.Webview;
}

test('renderPanelHtml 生成带 nonce 的 CSP', () => {
  const html = renderPanelHtml(fakeWebview());

  assert.match(html, /default-src 'none'/);
  assert.match(html, /style-src vscode-webview:\/\/test 'unsafe-inline'/);
  assert.match(html, /script-src 'nonce-[A-Za-z0-9]{32}'/);
});

test('renderPanelHtml 每次生成不同的 nonce', () => {
  assert.notEqual(renderPanelHtml(fakeWebview()), renderPanelHtml(fakeWebview()));
});

test('renderPanelHtml 包含面板关键控件与 i18n 挂载点', () => {
  const html = renderPanelHtml(fakeWebview());

  for (const id of ['providers', 'baseUrl', 'model', 'fetchModels', 'apiKey', 'clearKey', 'style', 'language', 'maxDiffChars', 'customPrompt', 'test', 'save', 'cancel', 'status']) {
    assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
  }
  assert.ok(html.includes('data-i18n="providerTitle"'));
  assert.ok(html.includes('acquireVsCodeApi()'));
});

test('renderPanelHtml 不在 HTML 里硬编码可变文案', () => {
  const html = renderPanelHtml(fakeWebview());
  assert.ok(!html.includes('https://api.deepseek.com'), 'provider base urls should come from host via postMessage');
});

test('renderPanelHtml 产出的 webview 脚本语法有效', () => {
  const html = renderPanelHtml(fakeWebview());
  const script = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
  assert.ok(script, 'inline script not found');
  // new Function 只做解析，不执行；能捕获模板字符串转义失真导致的语法错误
  assert.doesNotThrow(() => new Function(script[1]));
});
