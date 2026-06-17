# Auto Commit

AI 驱动的 VS Code 插件，自动分析 Git 代码变更并生成高质量的 Commit Message。

## 功能特性

- **AI 自动生成** — 分析 `git diff` 内容，一键生成符合规范的 Commit Message
- **Source Control 集成** — 在 Git 面板直接点击 sparkle 按钮生成
- **多种风格** — 支持 Conventional Commits、简洁模式、详细模式
- **双语支持** — 生成语言可选中文或英文
- **兼容多平台** — 支持 OpenAI 格式 API（DeepSeek、OpenAI 等）
- **自定义 Prompt** — 可追加自定义 System Prompt 控制生成行为

## 安装

1. 在 VS Code 扩展商店搜索 "Auto Commit"
2. 点击安装

## 使用方法

1. 在编辑器中修改代码
2. 打开 **Source Control** 面板（Ctrl+Shift+G）
3. 点击工具栏的 sparkle 按钮，或按 `Ctrl+Shift+P` 输入 **"生成 Commit Message"**
4. 生成的 Commit Message 会自动填入输入框

## 配置项

在 VS Code Settings 中搜索 `Auto Commit` 进行配置：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `autoCommit.apiKey` | AI 服务的 API Key | - |
| `autoCommit.baseUrl` | OpenAI 兼容格式的 API 基础地址 | `https://api.deepseek.com` |
| `autoCommit.model` | 用于生成 Commit 的模型名称 | `deepseek-v4-flash` |
| `autoCommit.style` | Commit 信息风格（conventional / simple / detailed） | `conventional` |
| `autoCommit.language` | 生成 Commit 信息的语言（English / Chinese） | `Chinese` |
| `autoCommit.customPrompt` | 追加在风格模板后的自定义 System Prompt | - |

## 快速开始（DeepSeek）

1. 前往 [DeepSeek 开放平台](https://platform.deepseek.com) 获取 API Key
2. 在 VS Code Settings 中设置 `autoCommit.apiKey`
3. 默认已配置 DeepSeek 的 baseUrl 和模型，直接点击 sparkle 按钮即可使用

## Commit 风格说明

- **conventional** — 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范，格式如 `feat(scope): description`
- **simple** — 一句话简洁描述变更
- **detailed** — 短摘要 + 详细变更说明

## 本地开发

```bash
git clone https://github.com/bin-ran/auto-commit.git
cd auto-commit
npm install
# 按 F5 启动 Extension Host 调试
```

## 发布

```bash
npm install -g @vscode/vsce
vsce package   # 打包
vsce publish   # 发布
```

## License

MIT
