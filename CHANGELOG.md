# Change Log

All notable changes to the "smart-commit-message" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added

- `smartCommitMessage.maxDiffChars` setting to control how much diff is sent to the AI service
- `Set API Key` / `Clear API Key` commands
- Unit tests and a GitHub Actions CI workflow

### Changed

- The API key is now stored in VS Code SecretStorage; the `smartCommitMessage.apiKey` setting is deprecated and only read once for migration
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
