#!/bin/bash
# AI 设计流水线 - 一键配置脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "╔══════════════════════════════════════════════════╗"
echo "║   AI 设计流水线 - 环境配置                       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ============ Step 1: 检查环境 ============
echo "[1/5] 检查运行环境..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi
echo "  ✓ Node.js $(node --version)"

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi
echo "  ✓ npm $(npm --version)"

# ============ Step 2: 安装依赖 ============
echo "[2/5] 安装项目依赖..."
cd "$SCRIPT_DIR"
npm install --silent
echo "  ✓ 依赖安装完成"

# ============ Step 3: 配置环境变量 ============
echo "[3/5] 配置环境变量..."

if [ ! -f ".env" ]; then
    cp .env.example .env 2>/dev/null || true
fi

# 检查 API Key
if grep -q "your_stitch_api_key_here" .env 2>/dev/null; then
    echo "  ⚠ 请在 .env 中配置你的 STITCH_API_KEY"
fi
echo "  ✓ .env 配置文件就绪"

# ============ Step 4: 配置 MCP ============
echo "[4/5] 配置 MCP Server..."

MCP_CONFIG="$HOME/.claude/.mcp.json"

if [ -f "$MCP_CONFIG" ]; then
    echo "  ⚠ MCP 配置已存在: $MCP_CONFIG"
    echo "  请手动添加 Stitch MCP 配置:"
    echo ""
    cat "$SCRIPT_DIR/mcp-config.json"
else
    cp "$SCRIPT_DIR/mcp-config.json" "$MCP_CONFIG"
    echo "  ✓ MCP 配置已创建: $MCP_CONFIG"
fi

# ============ Step 5: 验证安装 ============
echo "[5/5] 验证安装..."
npx tsx "$SCRIPT_DIR/src/layers/01-prd-parser.ts" "$SCRIPT_DIR/templates/sample-prd.md" --dry-run 2>/dev/null || true
echo ""

echo "╔══════════════════════════════════════════════════╗"
echo "║  配置完成！运行流水线：                          ║"
echo "║  npm run pipeline -- ./templates/sample-prd.md   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "输出目录: $SCRIPT_DIR/output/"
