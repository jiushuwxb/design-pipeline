/**
 * 第 5 层：AI 设计评审 + 迭代闭环
 * 输入：DesignBrief + 生成的代码 + 设计稿截图（可选）
 * 输出：ReviewReport（评分 + 问题清单 + 是否需迭代）
 *
 * 评审维度：
 * 1. 一致性 - 颜色/间距/字体是否与设计系统一致
 * 2. 完整性 - 是否覆盖了所有页面和组件状态
 * 3. 可用性 - 交互是否清晰、信息架构是否合理
 * 4. 可访问性 - 颜色对比度、键盘导航、语义标签
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve } from "path";
import { config } from "../config.js";
import { callAIJson } from "../api.js";
import { BuildVerification, DesignBrief, ReviewReport, VisualEvidenceReport, type ReviewIssue } from "../types.js";

const SYSTEM_PROMPT = `你是一个资深 UI/UX 设计评审专家。你的任务是对 AI 生成的设计方案进行全面评审。

评审维度：
1. **一致性 (Consistency)**：颜色、间距、字体、圆角等是否全局一致
2. **完整性 (Completeness)**：所有页面和组件状态（加载/空/错误）是否覆盖
3. **可用性 (Usability)**：交互逻辑是否清晰、信息层级是否合理、导航是否顺畅
4. **可访问性 (Accessibility)**：颜色对比度、键盘可操作性、语义化标签

评分标准：
- 90-100：优秀，可直接上线
- 80-89：良好，少量小问题可修复
- 60-79：一般，需要一轮迭代
- <60：较差，需要重新设计

请以 JSON 格式返回评审报告：
{
  "overallScore": 85,
  "summary": "总体评价（2-3句话）",
  "issues": [
    {
      "severity": "critical|major|minor|suggestion",
      "category": "consistency|completeness|usability|accessibility|performance",
      "description": "问题描述",
      "location": "具体位置（页面/组件名）",
      "suggestion": "修复建议"
    }
  ],
  "passThreshold": 80,
  "needIteration": true
}

规则：
1. 严格评审，不要给面子分
2. 每个问题必须给出具体的修复建议
3. 重点关注组件状态覆盖和交互设计
4. 只有 overallScore >= 80 才算通过
5. 构建未通过时必须判定为 critical，且总分不得达到 80
6. 没有实际截图内容时，不得声称已经验证视觉质量、响应式布局或像素级一致性
7. 只返回 JSON，不要其他文字`;

export async function reviewDesign(briefPath: string): Promise<ReviewReport> {
  console.log("═══════════════════════════════════════");
  console.log("  第 5 层：AI 设计评审");
  console.log("═══════════════════════════════════════\n");

  const brief = DesignBrief.parse(JSON.parse(readFileSync(briefPath, "utf-8")));
  const projectDir = resolve(config.paths.output, brief.project);

  // 收集评审材料
  console.log("[1/3] 收集评审材料...");

  let codeContent = "";
  const codeDir = config.pipeline.mode === "development"
    ? resolve(projectDir, "dev-project")
    : resolve(projectDir, "generated-code");
  try {
    codeContent = readFileSync(resolve(codeDir, "all-components.html"), "utf-8");
  } catch {
    // 尝试逐个读取
    try {
      const walkDir = (dir: string, prefix = ""): string => {
        let result = "";
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            result += walkDir(resolve(dir, entry.name), `${prefix}/${entry.name}`);
          } else if (/\.(tsx|ts|jsx|js|vue|html|css)$/.test(entry.name)) {
            result += `\n// ${prefix}/${entry.name}\n`;
            result += readFileSync(resolve(dir, entry.name), "utf-8");
          }
        }
        return result;
      };
      codeContent = walkDir(codeDir);
    } catch {
      console.log("  ⚠ 未找到生成的代码文件，仅评审设计概要");
    }
  }

  const buildPath = resolve(projectDir, "build-verification.json");
  const buildVerification = existsSync(buildPath)
    ? BuildVerification.parse(JSON.parse(readFileSync(buildPath, "utf-8")))
    : { status: "skipped" as const, projectPath: "", checkedAt: new Date().toISOString(), output: "No build verification was produced." };

  const visualDir = resolve(projectDir, "visual-evidence");
  const visualEvidence = existsSync(visualDir)
    ? readdirSync(visualDir).filter((name) => /\.(png|jpe?g|webp)$/i.test(name)).map((name) => resolve(visualDir, name))
    : [];
  const visualReviewPath = resolve(visualDir, "review.json");
  const visualReview = existsSync(visualReviewPath)
    ? VisualEvidenceReport.parse(JSON.parse(readFileSync(visualReviewPath, "utf-8")))
    : null;

  // 构建评审 prompt
  const reviewPrompt = JSON.stringify(
    {
      project: brief.project,
      theme: brief.theme,
      pages: brief.pages.map((p) => ({
        name: p.name,
        route: p.route,
        layout: p.layout,
        componentCount: p.components.length,
        components: p.components.map((c) => ({
          name: c.name,
          type: c.type,
          states: c.states,
          interactions: c.interactions,
        })),
      })),
      sharedComponents: brief.sharedComponents.length,
      generatedCode: codeContent
        ? `（代码已生成，共 ${codeContent.split("\n").length} 行）\n${codeContent.slice(0, 30000)}`
        : "(代码尚未生成，仅评审设计概要)",
      buildVerification: {
        status: buildVerification.status,
        command: buildVerification.command,
        output: buildVerification.output.slice(-8000),
      },
      visualEvidence: visualReview
        ? { status: "browser-reviewed", report: visualReview, files: visualEvidence }
        : { status: "unavailable", files: visualEvidence, note: "No validated browser review.json exists. This is a code/brief review only; do not claim visual or responsive verification." },
    },
    null,
    2
  );

  console.log("[2/3] AI 评审中...");
  const report = await callAIJson({
    system: SYSTEM_PROMPT,
    prompt: `请对以下设计方案进行评审：\n\n${reviewPrompt}`,
    schema: ReviewReport,
    schemaName: "ReviewReport",
  });

  if (buildVerification.status !== "passed") {
    report.issues.unshift({
      severity: "critical",
      category: "performance",
      description: buildVerification.status === "failed" ? "生成项目未通过构建验证" : "生成项目未执行构建验证",
      location: buildVerification.projectPath || "generated project",
      suggestion: `修复构建错误并重新执行验证。${buildVerification.output.slice(-1000)}`,
    });
    report.overallScore = Math.min(report.overallScore, 79);
  }
  if (visualReview?.status === "failed") {
    report.issues.unshift({
      severity: "major",
      category: "usability",
      description: "浏览器视觉验证未通过",
      location: "visual-evidence/review.json",
      suggestion: visualReview.findings.join("；") || "根据桌面端和移动端截图修复视觉问题后重新验证。",
    });
    report.overallScore = Math.min(report.overallScore, 79);
  }

  // 判断是否需要迭代
  report.needIteration = report.overallScore < config.pipeline.reviewThreshold;

  // 保存评审报告
  const reviewPath = resolve(projectDir, "review-report.json");
  writeFileSync(reviewPath, JSON.stringify(report, null, 2), "utf-8");

  // 生成可读的报告 Markdown
  const markdown = generateMarkdownReport(report, brief);
  writeFileSync(resolve(projectDir, "review-report.md"), markdown, "utf-8");

  console.log("[3/3] 评审完成\n");

  // 打印结果
  console.log(`  总分: ${report.overallScore}/100 (阈值: ${config.pipeline.reviewThreshold})`);
  console.log(`  通过: ${report.needIteration ? "❌ 需要迭代" : "✓ 通过评审"}`);
  console.log(`  问题数: ${report.issues.length}`);
  console.log(`    - Critical: ${report.issues.filter((i) => i.severity === "critical").length}`);
  console.log(`    - Major: ${report.issues.filter((i) => i.severity === "major").length}`);
  console.log(`    - Minor: ${report.issues.filter((i) => i.severity === "minor").length}`);
  console.log(`    - Suggestion: ${report.issues.filter((i) => i.severity === "suggestion").length}`);
  console.log(`\n报告已保存: ${reviewPath}`);
  console.log(`Markdown: ${resolve(projectDir, "review-report.md")}\n`);

  return report;
}

function generateMarkdownReport(report: ReviewReport, brief: DesignBrief): string {
  const severityEmoji: Record<string, string> = {
    critical: "🔴",
    major: "🟠",
    minor: "🟡",
    suggestion: "💡",
  };

  const categoryName: Record<string, string> = {
    consistency: "一致性",
    completeness: "完整性",
    usability: "可用性",
    accessibility: "可访问性",
    performance: "性能",
  };

  return `# 设计评审报告

## ${brief.project}

**总分**: ${report.overallScore}/100
**状态**: ${report.needIteration ? "需要迭代 ❌" : "通过 ✓"}
**通过阈值**: ${report.passThreshold}

### 总结

${report.summary}

---

## 问题清单

| 严重度 | 类别 | 问题 | 建议 |
|--------|------|------|------|
${report.issues
  .map(
    (i) =>
      `| ${severityEmoji[i.severity]} | ${categoryName[i.category]} | ${i.description}${i.location ? ` (${i.location})` : ""} | ${i.suggestion} |`
  )
  .join("\n")}

---

## 建议的迭代方向

${report.issues
  .filter((i) => i.severity === "critical" || i.severity === "major")
  .map((i) => `- [${i.category}] ${i.suggestion}`)
  .join("\n")}

---
*由 AI 设计评审自动生成*
`;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes("05-design")) {
  const briefPath = process.argv[2] || resolve(config.paths.output, "../output/我的项目/design-brief.json");
  reviewDesign(briefPath).catch(console.error);
}
