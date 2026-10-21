# Change Log

All notable changes to the "smart-commit-message" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added

- Configuration panel (webview) with provider presets for DeepSeek, GLM, Qwen and MiMo, model list fetching, inline validation and a connection test
- Import / export of the extension configuration, with API keys excluded by default and field validation on import
- `GET /models` support and a connection probe that falls back to a minimal chat request
- `smartCommitMessage.maxDiffChars` setting to control how much diff is sent to the AI service
- `Set API Key` / `Clear API Key` commands
- Unit tests and a GitHub Actions CI workflow

### Changed

- API keys are stored per provider in VS Code SecretStorage (one slot per preset plus one per custom endpoint), and are migrated from the previous single key automatically
- The configuration panel marks the default provider (`★`) and providers that already have a key (`●`)
- `baseUrl` and `model` are machine-scoped settings, so a workspace can no longer override them
- Generation can be cancelled and times out after 60 seconds
- The diff is read with `git diff HEAD`, so staged and unstaged changes are both included, and new untracked files are appended
- Diff truncation now drops whole files instead of cutting hunks in half
- Requests use `fetch`, with HTTP status, non-JSON response and empty response handling

### Security

- The extension is disabled in restricted mode (untrusted workspaces)
- `baseUrl` must use https (plain http is only accepted for loopback hosts)

## [0.0.1]

- Initial release
