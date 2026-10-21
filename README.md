# Smart Commit Message

<div align="center">
  <a href="./README.zh.md">中文</a> | English
</div>

AI-powered VS Code extension that automatically analyzes Git code changes and generates high-quality commit messages.

## Features

- **AI Auto-Generation** — Analyzes `git diff` content and generates commit messages with one click
- **Source Control Integration** — Click the sparkle button directly in the Git panel
- **Multiple Styles** — Supports Conventional Commits, Simple, and Detailed modes
- **Bilingual Support** — Choose between Chinese or English for generated messages
- **Provider Presets** — Built-in presets for DeepSeek, GLM, Qwen and MiMo, plus any OpenAI-compatible endpoint
- **Configuration Panel** — One panel to pick a provider, fetch models, set the API key and test the connection
- **Custom Prompt** — Append custom system prompts to control generation behavior

## Installation

1. Search for "Smart Commit Message" in the VS Code Extension Marketplace
2. Click Install

## Usage

1. Edit your code in the editor
2. Open the **Source Control** panel (Ctrl+Shift+G)
3. Click the sparkle button in the toolbar, or press `Ctrl+Shift+P` and type **"Generate Commit Message"**
4. The generated commit message will be automatically filled into the input box

Click the gear button in the Source Control title bar (or run **"Configure Model"**) to open the configuration panel: pick a provider preset, fetch the available models, paste your API key, then use **Test connection** before saving. `★` marks the default provider used for generation, `●` means a key is saved, `✓` means that provider has a saved configuration. **Save** only updates the selected provider; use **Set as default** to switch which provider generation uses.

## Configuration

Run `Smart Commit Message: Set API Key` from the Command Palette to store your API key — it is kept in VS Code SecretStorage and never written to `settings.json`.

Other settings can be searched in VS Code Settings:

| Setting | Description | Default |
| ------- | ----------- | ------- |
| `smartCommitMessage.providers` | Per-provider saved baseUrl/model, keyed by provider slot (managed by the configuration panel) | `{}` |
| `smartCommitMessage.defaultProvider` | Provider slot used for commit generation | - |
| `smartCommitMessage.baseUrl` | Fallback base URL used before any provider is saved (machine scope, must be https unless localhost) | `https://api.deepseek.com` |
| `smartCommitMessage.model` | Fallback model name used before any provider is saved (machine scope) | `deepseek-flash` |
| `smartCommitMessage.style` | Commit message style (conventional / simple / detailed) | `conventional` |
| `smartCommitMessage.language` | Language for generated commits (English / Chinese), follows the VS Code display language when unset | - |
| `smartCommitMessage.customPrompt` | Custom system prompt appended after the style template | - |
| `smartCommitMessage.apiKey` | Deprecated — only read once to migrate to SecretStorage | - |

API keys are stored per provider (DeepSeek / GLM / Qwen / MiMo, plus one slot per custom endpoint) in VS Code SecretStorage, so switching providers does not require re-entering keys. `Smart Commit Message: Clear API Key` clears the key of the currently configured provider.

`baseUrl` and `model` are machine-scoped so a workspace can never redirect your requests (and your API key) to another endpoint.

## Quick Start (DeepSeek)

1. Get your API Key from the [DeepSeek Platform](https://platform.deepseek.com)
2. Run **"Configure Model"**, keep the DeepSeek preset and paste the key
3. Click the sparkle button in the Source Control panel

Other presets: GLM (`https://open.bigmodel.cn/api/paas/v4`), Qwen (`https://dashscope.aliyuncs.com/compatible-mode/v1`), MiMo (`https://api.xiaomimimo.com/v1`). Choose **Custom** for any other OpenAI-compatible gateway.

## Notes

- The generated diff (including new untracked files, binary/large files omitted) is sent to the configured API endpoint.
- The extension is disabled in restricted mode (untrusted workspaces) since it sends code to a remote service.

## Import / Export

Use **"Export Configuration"** / **"Import Configuration"** from the Command Palette, or the buttons at the bottom of the configuration panel, to move settings between machines.

- The exported JSON contains `baseUrl`, `model`, `style`, `language`, `maxDiffChars` and `customPrompt`. API keys are **excluded by default**; including them writes plain text into the file, so you are asked to confirm.
- Import validates every field (https-only base URLs, known style/language values, numeric `maxDiffChars`) and ignores unknown keys, so a hand-edited or foreign file cannot inject arbitrary settings.
- When the file contains keys you can choose to import them or apply settings only; keys for unknown slots are skipped.

```json
{
  "version": 1,
  "exportedAt": "2026-01-01T00:00:00.000Z",
  "settings": {
    "baseUrl": "https://api.deepseek.com",
    "model": "deepseek-flash",
    "style": "conventional",
    "language": "Chinese",
    "maxDiffChars": 8000,
    "customPrompt": ""
  }
}
```

## Commit Style Reference

- **conventional** — Follows the [Conventional Commits](https://www.conventionalcommits.org/) spec, e.g. `feat(scope): description`
- **simple** — One concise sentence describing the change
- **detailed** — Short summary + detailed change description

## Development & Release

```bash
pnpm install
pnpm run compile   # TypeScript build (out/)
pnpm run lint      # ESLint with --max-warnings 0
pnpm test          # Build + node:test suite
```

Press F5 to launch Extension Host debugging.

```bash
pnpm dlx @vscode/vsce package   # Package
pnpm dlx @vscode/vsce publish   # Publish
```

## License

MIT
