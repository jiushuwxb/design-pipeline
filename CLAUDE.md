# Design Pipeline — AI 设计流水线

PRD → Stitch 设计稿 → 组件代码 → Vercel 部署 → 设计评审，5 层自动化。

## 环境依赖

| 依赖 | 版本 | 用途 |
|---|---|---|
| Node.js | 18+ | 运行时 |
| npm | 9+ | 包管理 |
| Vercel CLI | 最新 | L4 自动部署 (`npm i -g vercel`) |

### 重要：Google 服务需要代理

流水线的 L2 和 Stitch MCP 需要访问 Google 服务（`stitch.googleapis.com`），中国大陆网络环境下必须配置代理。

**确保以下之一可用：**
- Clash Verge TUN 模式（推荐，全系统代理）
- 或手动设置系统代理 `127.0.0.1:7890` 并配置 Claude Code 环境变量

## 快速开始

```bash
# 1. 克隆后安装依赖
cd design-pipeline
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 API Key

# 3. 注册 Stitch MCP（需先配置代理，见下方）
claude mcp add stitch \
  --transport http https://stitch.googleapis.com/mcp \
  --header "X-Goog-Api-Key: 你的Stitch-API-Key" \
  -s user

# 4. 运行流水线
npm run interactive -- ./templates/sample-prd.md
```

## 环境配置详解

### 1. AI API（L1/L3/L5 调用）

在 `.env` 中配置。支持 Anthropic / DeepSeek / 任意 OpenAI 兼容 API：

```env
ANTHROPIC_API_KEY=你的API-Key
ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
ANTHROPIC_MODEL=DeepSeek-V4-pro[1m]
```

### 2. Stitch MCP 配置（L2 设计稿生成）

Stitch 是 Google 的远程 HTTP MCP 服务，需要在 Claude Code 中注册：

```bash
claude mcp add stitch \
  --transport http https://stitch.googleapis.com/mcp \
  --header "X-Goog-Api-Key: 你的Stitch-API-Key" \
  -s user
```

API Key 获取：https://stitch.withgoogle.com → Settings → API Keys → Create

**验证连通：**
```bash
claude mcp list
# 应显示：stitch: https://stitch.googleapis.com/mcp (HTTP) - ✓ Connected
```

### 3. 代理配置（中国大陆必需）

Claude Code 是 Node.js 进程，不自动读取 Windows 系统代理。需要在 Claude Code 设置中显式注入：

**文件：`~/.claude/settings.json`**（Windows: `C:\Users\<用户名>\.claude\settings.json`）

```json
{
  "env": {
    "HTTP_PROXY": "http://127.0.0.1:7890",
    "HTTPS_PROXY": "http://127.0.0.1:7890"
  }
}
```

重启 Claude Code 后生效。

### 4. Vercel 部署（L4）

```env
VERCEL_TOKEN=你的Vercel-Token
VERCEL_SCOPE=你的团队名
```

Token 获取：https://vercel.com/account/tokens → Create Token → Full Account

### 5. 流水线模式配置

```env
PIPELINE_MODE=preview              # preview | development
PREVIEW_FRAMEWORK=react            # react | vue | html
DEV_FRONTEND_FRAMEWORK=react       # react | vue
DEV_BACKEND_FRAMEWORK=express      # express | fastify | koa
```

## 常用命令

```bash
# 交互式向导（推荐）
npm run interactive -- ./templates/sample-prd.md

# 命令行直接跑
npm run pipeline -- ./templates/sample-prd.md --mode preview --framework react

# 分层运行
npm run layer1 -- <PRD路径>     # PRD 解析 → design-brief.json
npm run layer2 -- <brief路径>   # Stitch Prompt 生成
npm run layer3 -- <brief路径>   # 代码生成
npm run layer4 -- <brief路径>   # 部署预览
npm run layer5 -- <brief路径>   # 设计评审

# 流水线完成后，在 Claude Code 中用 Stitch 生成设计稿
# /stitch-design
```

## 故障排查

| 问题 | 原因 | 解决 |
|---|---|---|
| `fetch failed` (Stitch MCP) | 代理未配置或 Stitch MCP 未注册 | 检查 `claude mcp list`，确认 settings.json 有 `HTTPS_PROXY` |
| `ECONNRESET` (Vercel) | 网络波动 | 重试，或手动 `cd deploy-preview && vercel deploy --prod` |
| L1 报 JSON 解析失败 | AI 返回内容被截断 | `api.ts` 的 `maxTokens` 已设 16384，若仍截断可继续调大 |
| L3 组件生成失败 | AI API 超时 | 单个组件失败会跳过继续下一个，不会中断流水线 |
| `npm run dev` 报错 | 模板项目依赖未安装 | `cd deploy-preview && npm install` |
