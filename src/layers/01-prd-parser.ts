/**
 * 第 1 层：PRD 需求解析器
 * 输入：PRD 文档（Markdown/文本）
 * 输出：结构化 DesignBrief（JSON）
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { config } from "../config.js";
import { callAI } from "../api.js";
import type { DesignBrief } from "../types.js";

const SYSTEM_PROMPT = `你是一个资深产品需求分析师。从产品需求文档中提取结构化设计概要。

返回 JSON（不要其他文字）：

{
  "project": "项目名称",
  "theme": {
    "style": "设计风格",
    "colors": ["主色", "辅助色", "强调色"],
    "atmosphere": "professional/warm/tech/dark"
  },
  "pages": [
    {
      "name": "页面名称",
      "route": "/路由",
      "description": "功能描述",
      "layout": "single-column|two-column|dashboard|fullscreen",
      "components": [
        {
          "name": "组件名",
          "type": "form|table|card|nav|sidebar|modal|chart|list|header|footer|button|input|other",
          "description": "功能描述",
          "states": ["加载中", "空数据", "错误"],
          "interactions": ["交互行为"]
        }
      ]
    }
  ],
  "sharedComponents": []
}

规则：推断所有页面、标注组件状态和交互、识别共享组件。只返回 JSON。`;

export async function parsePRD(prdPath: string): Promise<DesignBrief> {
  console.log("═══════════════════════════════════════");
  console.log("  第 1 层：PRD 需求解析");
  console.log("═══════════════════════════════════════\n");

  const prdContent = readFileSync(prdPath, "utf-8");
  console.log(`[1/3] 读取 PRD: ${prdPath} (${prdContent.length} 字符)`);
  console.log("[2/3] AI 解析中...");

  const result = await callAI({
    system: SYSTEM_PROMPT,
    prompt: `分析 PRD 文档，提取结构化设计概要：\n\n<prd>\n${prdContent}\n</prd>`,
    extractJson: true,
  });

  const brief = result.json as DesignBrief;
  console.log(`[3/3] 解析完成: ${brief.pages.length} 页面, ${brief.sharedComponents?.length || 0} 共享组件`);

  for (const page of brief.pages) {
    console.log(`  - ${page.name} (${page.route}): ${page.components.length} 组件`);
  }

  const outDir = resolve(config.paths.output, brief.project);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "design-brief.json"), JSON.stringify(brief, null, 2), "utf-8");
  console.log(`\n设计概要已保存: ${outDir}/design-brief.json\n`);

  return brief;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes("01-prd-parser")) {
  const prdPath = process.argv[2] || resolve("templates/sample-prd.md");
  parsePRD(prdPath).catch(console.error);
}
