# Smart Commit Message

<div align="center">
  中文 | <a href="./README.md">English</a>
</div>

AI 驱动的 VS Code 插件，自动分析 Git 代码变更并生成高质量的 Commit Message。

## 功能特性

- **AI 自动生成** — 分析 `git diff` 内容，一键生成符合规范的 Commit Message
- **Source Control 集成** — 在 Git 面板直接点击 sparkle 按钮生成
- **多种风格** — 支持 Conventional Commits、简洁模式、详细模式
- **双语支持** — 生成语言可选中文或英文
- **服务商预设** — 内置 DeepSeek、GLM、Qwen、MiMo，也可接入任意 OpenAI 兼容网关
- **配置面板** — 一个面板搞定选服务商、拉取模型、填 Key、测连接
- **自定义 Prompt** — 可追加自定义 System Prompt 控制生成行为

## 安装

1. 在 VS Code 扩展商店搜索 "Smart Commit Message"
2. 点击安装

## 使用方法

1. 在编辑器中修改代码
2. 打开 **Source Control** 面板（Ctrl+Shift+G）
3. 点击工具栏的 sparkle 按钮，或按 `Ctrl+Shift+P` 输入 **"生成 Commit Message"**
4. 生成的 Commit Message 会自动填入输入框

点击 Source Control 标题栏的齿轮按钮（或运行 **"配置大模型"**）打开配置面板：选服务商预设 → 拉取可用模型 → 粘贴 API Key → **测试连接** → 保存。`★` 表示生成时使用的默认服务商，`●` 表示已保存 Key，`✓` 表示该服务商已保存配置。**保存** 只更新当前服务商，要切换生成用的服务商请点 **设为默认**。

## 配置项

API Key 通过命令面板运行 **「Smart Commit Message: 设置 API Key」** 配置，保存在 VS Code SecretStorage 中，不会写进 `settings.json`。

其余配置项在 VS Code Settings 中搜索 `Smart Commit Message` 进行配置：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `smartCommitMessage.providers` | 各服务商保存的 baseUrl/model，按槽位存储（由配置面板维护） | `{}` |
| `smartCommitMessage.defaultProvider` | 生成 Commit 时使用的服务商槽位 | - |
| `smartCommitMessage.baseUrl` | 尚未保存任何服务商时的备用 Base URL（machine 级，非 localhost 必须是 https） | `https://api.deepseek.com` |
| `smartCommitMessage.model` | 尚未保存任何服务商时的备用模型（machine 级） | `deepseek-flash` |
| `smartCommitMessage.style` | Commit 信息风格（conventional / simple / detailed） | `conventional` |
| `smartCommitMessage.language` | 生成 Commit 信息的语言（English / Chinese），未设置时跟随 VS Code 界面语言 | - |
| `smartCommitMessage.customPrompt` | 追加在风格模板后的自定义 System Prompt | - |
| `smartCommitMessage.apiKey` | 已弃用——仅在迁移时读取一次 | - |

API Key 按服务商分别保存在 VS Code SecretStorage 中（DeepSeek / GLM / Qwen / MiMo，以及每个自定义地址一个槽位），切换服务商不需要重新输入。运行 **「Smart Commit Message: 清除 API Key」** 只清除当前配置服务商的 Key。

`baseUrl` 与 `model` 为 machine 级配置，工作区无法覆盖，避免仓库把请求（连同 API Key）指向别处。

## 快速开始（DeepSeek）

1. 前往 [DeepSeek 开放平台](https://platform.deepseek.com) 获取 API Key
2. 运行 **「配置大模型」**，保持 DeepSeek 预设并粘贴 Key
3. 在 Source Control 面板点击 sparkle 按钮

其他预设：GLM（`https://open.bigmodel.cn/api/paas/v4`）、Qwen（`https://dashscope.aliyuncs.com/compatible-mode/v1`）、MiMo（`https://api.xiaomimimo.com/v1`）。其他 OpenAI 兼容网关选 **自定义**。

## 说明

- 生成的 diff（含未跟踪的新文件，二进制/超大文件会跳过）会发送到配置的 API 地址。
- 扩展在受限模式（不受信任的工作区）下不启用：它会把代码发送到远端服务。

## 导入 / 导出配置

在命令面板运行 **「导出配置」/「导入配置」**，或使用配置面板底部的按钮，即可在多台机器之间迁移设置。

- 导出的 JSON 包含 `baseUrl`、`model`、`style`、`language`、`maxDiffChars`、`customPrompt`。API Key **默认不导出**；选择包含时会以明文写入文件，因此会先确认。
- 导入时逐项校验（Base URL 必须 https、风格/语言取值白名单、`maxDiffChars` 为数字），未识别的字段一律忽略，手工改过或来源不明的文件无法注入任意配置。
- 文件里带 Key 时可选「导入 Key」或「仅导入设置」；未知槽位的 Key 会被跳过。

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

## Commit 风格说明

- **conventional** — 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范，格式如 `feat(scope): description`
- **simple** — 一句话简洁描述变更
- **detailed** — 短摘要 + 详细变更说明

## 本地开发

```bash
pnpm install
pnpm run compile   # TypeScript 构建（输出到 out/）
pnpm run lint      # ESLint（--max-warnings 0）
pnpm test          # 构建 + node:test 单测
```

按 F5 启动 Extension Host 调试。

## 发布

```bash
pnpm dlx @vscode/vsce package   # 打包
pnpm dlx @vscode/vsce publish   # 发布
```

## License

MIT
