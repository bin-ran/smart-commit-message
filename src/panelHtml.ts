import type * as vscode from 'vscode';

function createNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let index = 0; index < 32; index += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

const STYLES = `
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: transparent;
    padding: 16px 20px 0;
    margin: 0;
  }
  main { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; padding-bottom: 64px; }
  .card {
    border: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
    border-radius: 6px;
    padding: 12px 14px 2px;
  }
  .card h2 {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--vscode-descriptionForeground); margin: 0 0 10px; font-weight: 600;
  }
  .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
  .field-label { font-size: 12px; color: var(--vscode-descriptionForeground); }
  input, textarea {
    background: var(--vscode-input-background); color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent); border-radius: 4px;
    padding: 6px 8px; font-family: inherit; font-size: inherit; width: 100%; box-sizing: border-box;
  }
  input:focus, textarea:focus { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }
  textarea { resize: vertical; }
  .row { display: flex; gap: 8px; align-items: center; }
  .row > input { flex: 1; }
  .hint { font-size: 12px; color: var(--vscode-descriptionForeground); }
  button {
    font-family: inherit; font-size: inherit; border-radius: 4px; padding: 5px 12px;
    cursor: pointer; border: 1px solid transparent; white-space: nowrap;
  }
  button.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  button.primary:hover { background: var(--vscode-button-hoverBackground); }
  button.secondary {
    background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);
  }
  button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
  button:disabled { opacity: 0.55; cursor: default; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chips-hint { margin: 8px 0 10px; }
  .combo { position: relative; flex: 1; }
  .combo > input { width: 100%; }
  .listbox {
    position: absolute; z-index: 20; left: 0; right: 0; top: 100%; margin: 4px 0 0;
    padding: 4px 0; list-style: none; box-sizing: border-box;
    max-height: 240px; overflow-y: auto; overflow-x: hidden;
    background: var(--vscode-dropdown-background, var(--vscode-input-background));
    border: 1px solid var(--vscode-dropdown-border, var(--vscode-panel-border, rgba(128, 128, 128, 0.35)));
    border-radius: 4px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
  }
  .listbox[hidden] { display: none; }
  .listbox li {
    padding: 4px 10px; cursor: pointer; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .listbox li[aria-selected="true"] {
    background: var(--vscode-list-activeSelectionBackground, rgba(128, 128, 128, 0.3));
    color: var(--vscode-list-activeSelectionForeground, inherit);
  }
  .listbox::-webkit-scrollbar { width: 10px; }
  .listbox::-webkit-scrollbar-thumb {
    background: var(--vscode-scrollbarSlider-background); border-radius: 5px;
  }
  .chip-mark { opacity: 0.75; margin-left: 6px; font-size: 11px; }
  .chips button { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  .chips button[aria-pressed="true"] { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .segmented { display: inline-flex; border: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35)); border-radius: 4px; overflow: hidden; width: fit-content; }
  .segmented button { border: 0; border-radius: 0; background: transparent; color: inherit; padding: 4px 14px; }
  .segmented button[aria-pressed="true"] { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  footer {
    position: fixed; left: 0; right: 0; bottom: 0; display: flex; align-items: center; gap: 8px;
    padding: 10px 20px; background: var(--vscode-editor-background);
    border-top: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
  }
  footer .inner { max-width: 760px; margin: 0 auto; display: flex; align-items: center; gap: 8px; width: 100%; }
  .spacer { flex: 1; }
  .status { font-size: 12px; color: var(--vscode-descriptionForeground); overflow: hidden; text-overflow: ellipsis; }
  .status.ok { color: var(--vscode-testing-iconPassed, #3fa34d); }
  .status.err { color: var(--vscode-errorForeground); }
`;

const SCRIPT = `
  const vscode = acquireVsCodeApi();
  const labels = {};
  let providers = [];
  let keySlots = [];
  let providerConfigs = {};
  let modelOptions = [];
  let activeModelIndex = -1;
  let defaultBaseUrl = '';
  let selectedProviderId = 'custom';
  let selectedStyle = 'conventional';
  let selectedLanguage = '';

  const byId = (id) => document.getElementById(id);
  const post = (type, payload) => vscode.postMessage(payload === undefined ? { type } : { type, payload });

  function setStatus(text, kind) {
    const node = byId('status');
    node.textContent = text || '';
    node.className = 'status' + (kind ? ' ' + kind : '');
  }

  function applyLabels() {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (labels[key]) node.textContent = labels[key];
    });
    document.querySelectorAll('[data-placeholder]').forEach((node) => {
      const key = node.getAttribute('data-placeholder');
      if (labels[key]) node.setAttribute('placeholder', labels[key]);
    });
  }

  function providerLabel(preset) {
    if (preset.id === 'custom') return labels.providerCustom || preset.label;
    return preset.label;
  }

  function normalizeBaseUrl(baseUrl) {
    // 不用正则，避免模板字符串里反斜杠转义失真
    let value = (baseUrl || '').trim().toLowerCase();
    while (value.endsWith('/')) value = value.slice(0, -1);
    return value;
  }

  function slotForPreset(preset) {
    return preset.id === 'custom' ? null : preset.id;
  }

  function hasKeyForPreset(preset) {
    const slot = slotForPreset(preset);
    if (!slot) return false;
    return keySlots.indexOf(slot) !== -1;
  }

  function hasSavedConfig(preset) {
    const slot = slotForPreset(preset);
    if (!slot) return false;
    return Boolean(providerConfigs[slot]);
  }

  function isDefaultProvider(preset) {
    if (!preset.baseUrl) return false;
    return normalizeBaseUrl(preset.baseUrl) === normalizeBaseUrl(defaultBaseUrl);
  }

  function renderProviders() {
    const container = byId('providers');
    container.textContent = '';
    providers.forEach((preset) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = (isDefaultProvider(preset) ? '★ ' : '') + providerLabel(preset);
      if (hasSavedConfig(preset)) {
        const savedMark = document.createElement('span');
        savedMark.className = 'chip-mark';
        savedMark.textContent = '✓';
        savedMark.title = labels.providerSavedMark || '';
        button.appendChild(savedMark);
      }
      if (hasKeyForPreset(preset)) {
        const mark = document.createElement('span');
        mark.className = 'chip-mark';
        mark.textContent = '●';
        mark.title = labels.apiKeySaved || '';
        button.appendChild(mark);
      }
      button.setAttribute('aria-pressed', String(preset.id === selectedProviderId));
      button.addEventListener('click', () => {
        selectedProviderId = preset.id;
        const saved = providerConfigs[preset.id];
        if (saved) {
          byId('baseUrl').value = saved.baseUrl;
          byId('model').value = saved.model;
        } else if (preset.baseUrl) {
          byId('baseUrl').value = preset.baseUrl;
          if (preset.models.length > 0) byId('model').value = preset.models[0];
        }
        renderProviders();
        requestKeyState();
      });
      container.appendChild(button);
    });
  }

  function renderSegmented(containerId, options, current, onSelect) {
    const container = byId(containerId);
    container.textContent = '';
    options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = option.label;
      button.setAttribute('aria-pressed', String(option.value === current));
      button.addEventListener('click', () => {
        onSelect(option.value);
        renderSegmented(containerId, options, option.value, onSelect);
      });
      container.appendChild(button);
    });
  }

  function renderStyle() {
    renderSegmented('style', [
      { value: 'conventional', label: labels.styleConventional || 'conventional' },
      { value: 'simple', label: labels.styleSimple || 'simple' },
      { value: 'detailed', label: labels.styleDetailed || 'detailed' },
    ], selectedStyle, (value) => { selectedStyle = value; });
  }

  function renderLanguage() {
    renderSegmented('language', [
      { value: '', label: labels.languageAuto || 'Auto' },
      { value: 'Chinese', label: '中文' },
      { value: 'English', label: 'English' },
    ], selectedLanguage, (value) => { selectedLanguage = value; });
  }

  function filteredModels() {
    const query = byId('model').value.trim().toLowerCase();
    if (!query) return modelOptions;
    return modelOptions.filter((model) => model.toLowerCase().indexOf(query) !== -1);
  }

  function renderModelList() {
    const list = byId('modelList');
    const items = filteredModels();
    list.textContent = '';
    activeModelIndex = items.length > 0 ? 0 : -1;

    items.forEach((model, index) => {
      const item = document.createElement('li');
      item.textContent = model;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(index === activeModelIndex));
      // mousedown 先于 blur，避免输入框失焦导致点击落空
      item.addEventListener('mousedown', (event) => {
        event.preventDefault();
        selectModel(model);
      });
      list.appendChild(item);
    });

    list.hidden = items.length === 0;
    byId('model').setAttribute('aria-expanded', String(!list.hidden));
  }

  function setModels(models) {
    modelOptions = Array.isArray(models) ? models.slice() : [];
    if (modelOptions.length === 0) {
      closeModelList();
      return;
    }
    renderModelList();
  }

  function closeModelList() {
    byId('modelList').hidden = true;
    byId('model').setAttribute('aria-expanded', 'false');
  }

  function selectModel(model) {
    byId('model').value = model;
    closeModelList();
  }

  function moveActiveModel(delta) {
    const items = filteredModels();
    if (items.length === 0) return;
    activeModelIndex = (activeModelIndex + delta + items.length) % items.length;

    const list = byId('modelList');
    Array.prototype.forEach.call(list.children, (item, index) => {
      item.setAttribute('aria-selected', String(index === activeModelIndex));
    });
    const active = list.children[activeModelIndex];
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ block: 'nearest' });
    }
  }

  function render(state) {
    Object.assign(labels, state.labels || {});
    providers = state.providers || [];
    keySlots = state.keySlots || [];
    providerConfigs = state.providerConfigs || {};
    defaultBaseUrl = state.defaultBaseUrl || '';
    selectedProviderId = 'custom';
    providers.forEach((preset) => {
      if (preset.baseUrl && preset.baseUrl.toLowerCase() === (state.baseUrl || '').toLowerCase()) {
        selectedProviderId = preset.id;
      }
    });
    selectedStyle = state.style || 'conventional';
    selectedLanguage = state.language || '';

    applyLabels();
    byId('baseUrl').value = state.baseUrl || '';
    byId('model').value = state.model || '';
    byId('maxDiffChars').value = state.maxDiffChars;
    byId('customPrompt').value = state.customPrompt || '';
    byId('apiKey').value = '';
    setKeyState(state.baseUrl, state.hasApiKey);

    renderProviders();
    renderStyle();
    renderLanguage();
    closeModelList();
  }

  function setKeyState(baseUrl, hasKey) {
    const text = hasKey ? (labels.keySavedForCurrent || '') : (labels.keyMissingForCurrent || '');
    byId('keyState').textContent = text + (labels.apiKeyPlaceholder ? ' · ' + labels.apiKeyPlaceholder : '');
    byId('clearKey').disabled = !hasKey;
  }

  function requestKeyState() {
    post('keyState', { baseUrl: byId('baseUrl').value });
  }

  function collect() {
    return {
      baseUrl: byId('baseUrl').value,
      model: byId('model').value,
      style: selectedStyle,
      language: selectedLanguage,
      maxDiffChars: Number(byId('maxDiffChars').value),
      customPrompt: byId('customPrompt').value,
      apiKey: byId('apiKey').value,
    };
  }

  function withBusy(button, busyText, task) {
    const original = button.textContent;
    button.disabled = true;
    button.textContent = busyText;
    try {
      task();
    } finally {
      setTimeout(() => {
        button.disabled = false;
        button.textContent = original;
      }, 400);
    }
  }

  byId('model').addEventListener('focus', () => {
    if (modelOptions.length > 0) renderModelList();
  });

  byId('model').addEventListener('input', () => {
    if (modelOptions.length > 0) renderModelList();
  });

  byId('model').addEventListener('keydown', (event) => {
    const list = byId('modelList');
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (list.hidden) renderModelList();
      moveActiveModel(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActiveModel(-1);
      return;
    }
    if (event.key === 'Enter') {
      const items = filteredModels();
      if (!list.hidden && activeModelIndex >= 0 && items[activeModelIndex]) {
        event.preventDefault();
        selectModel(items[activeModelIndex]);
      }
      return;
    }
    if (event.key === 'Escape' && !list.hidden) {
      // 先收起下拉，Escape 不再关闭整个面板
      event.preventDefault();
      event.stopPropagation();
      closeModelList();
    }
  });

  document.addEventListener('click', (event) => {
    if (!byId('modelList').hidden && !event.target.closest('.combo')) {
      closeModelList();
    }
  });

  byId('fetchModels').addEventListener('click', () => {
    setStatus(labels.fetching || '', '');
    withBusy(byId('fetchModels'), labels.fetching || '', () => {
      post('fetchModels', { baseUrl: byId('baseUrl').value, apiKey: byId('apiKey').value });
    });
  });

  byId('test').addEventListener('click', () => {
    setStatus(labels.testing || '', '');
    withBusy(byId('test'), labels.testing || '', () => {
      const draft = collect();
      post('test', { baseUrl: draft.baseUrl, model: draft.model, apiKey: draft.apiKey });
    });
  });

  byId('setDefault').addEventListener('click', () => {
    const draft = collect();
    post('setDefault', { baseUrl: draft.baseUrl });
  });

  byId('save').addEventListener('click', () => {
    setStatus(labels.saving || '', '');
    withBusy(byId('save'), labels.saving || '', () => post('save', collect()));
  });

  byId('baseUrl').addEventListener('change', requestKeyState);
  byId('clearKey').addEventListener('click', () => post('clearKey', { baseUrl: byId('baseUrl').value }));
  byId('importConfig').addEventListener('click', () => post('importConfig'));
  byId('exportConfig').addEventListener('click', () => post('exportConfig'));
  byId('cancel').addEventListener('click', () => post('close'));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') post('close');
  });

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'state') {
      render(message.state);
      return;
    }
    if (message.type === 'models') {
      if (message.models && message.models.length > 0) setModels(message.models);
      setStatus(message.message, message.models && message.models.length > 0 ? 'ok' : 'err');
      return;
    }
    if (message.type === 'testResult') {
      if (message.ok && message.models && message.models.length > 0) setModels(message.models);
      setStatus(message.message, message.ok ? 'ok' : 'err');
      return;
    }
    if (message.type === 'keyState') {
      setKeyState(message.baseUrl, message.hasKey);
      return;
    }
    if (message.type === 'saved') {
      setStatus(message.message || labels.saved || '', 'ok');
      return;
    }
    if (message.type === 'error') {
      setStatus(message.message, 'err');
    }
  });

  post('ready');
`;

export function renderPanelHtml(webview: vscode.Webview): string {
  const nonce = createNonce();

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Smart Commit Message</title>
<style nonce="${nonce}">${STYLES}</style>
</head>
<body>
<main>
  <section class="card">
    <h2 data-i18n="providerTitle"></h2>
    <div class="chips" id="providers"></div>
    <p class="hint chips-hint" data-i18n="providerHint"></p>
  </section>

  <section class="card">
    <h2 data-i18n="connectionTitle"></h2>
    <label class="field">
      <span class="field-label" data-i18n="baseUrl"></span>
      <input id="baseUrl" type="text" spellcheck="false" />
      <span class="hint" data-i18n="baseUrlHint"></span>
    </label>
    <label class="field">
      <span class="field-label" data-i18n="model"></span>
      <span class="row">
        <span class="combo">
          <input id="model" type="text" spellcheck="false" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="modelList" />
          <ul class="listbox" id="modelList" role="listbox" hidden></ul>
        </span>
        <button id="fetchModels" class="secondary" type="button" data-i18n="fetchModels"></button>
      </span>
      <span class="hint" data-i18n="modelHint"></span>
    </label>
    <label class="field">
      <span class="field-label" data-i18n="apiKey"></span>
      <span class="row">
        <input id="apiKey" type="password" autocomplete="off" spellcheck="false" data-placeholder="apiKeyPlaceholder" />
        <button id="clearKey" class="secondary" type="button" data-i18n="clearKey"></button>
      </span>
      <span class="hint" id="keyState"></span>
    </label>
  </section>

  <section class="card">
    <h2 data-i18n="generateTitle"></h2>
    <div class="field">
      <span class="field-label" data-i18n="style"></span>
      <div class="segmented" id="style"></div>
    </div>
    <div class="field">
      <span class="field-label" data-i18n="language"></span>
      <div class="segmented" id="language"></div>
    </div>
    <label class="field">
      <span class="field-label" data-i18n="maxDiffChars"></span>
      <input id="maxDiffChars" type="number" min="100" step="100" />
      <span class="hint" data-i18n="maxDiffCharsHint"></span>
    </label>
    <label class="field">
      <span class="field-label" data-i18n="customPrompt"></span>
      <textarea id="customPrompt" rows="3" data-placeholder="customPromptPlaceholder"></textarea>
    </label>
  </section>
</main>

<footer>
  <div class="inner">
    <button id="test" class="secondary" type="button" data-i18n="test"></button>
    <button id="importConfig" class="secondary" type="button" data-i18n="importConfig"></button>
    <button id="exportConfig" class="secondary" type="button" data-i18n="exportConfig"></button>
    <span class="status" id="status"></span>
    <span class="spacer"></span>
    <button id="cancel" class="secondary" type="button" data-i18n="cancel"></button>
    <button id="setDefault" class="secondary" type="button" data-i18n="setAsDefault"></button>
    <button id="save" class="primary" type="button" data-i18n="save"></button>
  </div>
</footer>

<script nonce="${nonce}">${SCRIPT}</script>
</body>
</html>`;
}
