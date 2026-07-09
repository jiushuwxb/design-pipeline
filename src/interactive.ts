/**
 * Interactive terminal workflow for Codex / Claude Code.
 *
 * Intended natural-language trigger:
 * "Read this PRD and run the design pipeline."
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { dirname, resolve } from "path";
import { createInterface } from "readline";
import { fileURLToPath } from "url";
import { listDesignStyles } from "./design-styles.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolveAnswer) => rl.question(question, resolveAnswer));
}

function isUiUxProMaxInstalled(): boolean {
  const home = homedir();
  return [
    resolve(home, ".codex", "skills", "ui-ux-pro-max"),
    resolve(home, ".agents", "skills", "ui-ux-pro-max"),
    resolve(projectRoot, ".agents", "skills", "ui-ux-pro-max"),
    resolve(projectRoot, ".codex", "skills", "ui-ux-pro-max"),
    resolve(projectRoot, ".claude", "skills", "ui-ux-pro-max"),
  ].some((path) => existsSync(path));
}

async function main() {
  const prdPath = process.argv[2];
  if (!prdPath) {
    console.log("Usage: npm run interactive -- <prd-path>\n");
    process.exit(0);
  }

  console.log("\nDesign Pipeline interactive workflow");
  console.log("1. Read PRD and parse design brief");
  console.log("2. Choose preview or development mode");
  console.log("3. Preview mode uses design prompting and bundled ui-ux-pro-max enhancement");
  console.log("4. Generate code after choosing html/vue/react");
  console.log("5. Build local preview and run AI review");
  console.log("6. Ask whether to deploy a Vercel preview after review passes\n");

  const modeChoice = await ask("Choose mode: [1] preview / [2] development (default 1): ");
  const mode = modeChoice.trim() === "2" ? "development" : "preview";

  let framework = "react";
  let backendFramework = "express";
  let designStyle = "premium-bento-saas";

  if (mode === "preview") {
    const hasUiSkill = isUiUxProMaxInstalled();
    process.env.UI_UX_PRO_MAX_AVAILABLE = hasUiSkill ? "true" : "false";
    console.log(`\nui-ux-pro-max skill: ${hasUiSkill ? "detected" : "project bundle missing"}`);
    if (hasUiSkill) {
      console.log("Preview mode will allow the agent to use ui-ux-pro-max for design prompt enhancement.");
    } else {
      console.log("Preview mode will continue with built-in prompt enhancement.");
    }

    const styles = listDesignStyles();
    console.log("\nChoose design style preset:");
    styles.forEach((style, index) => {
      const defaultMark = index === 0 ? " (default)" : "";
      console.log(`\n  [${index + 1}] ${style.name} / ${style.id}${defaultMark}`);
      console.log(`      Use cases: ${style.useCases.join(", ")}`);
      console.log(`      ${style.intro || style.description}`);
    });
    const styleAnswer = await ask(`Design style (default 1: ${styles[0]?.id || designStyle}): `);
    const styleIndex = Number(styleAnswer.trim());
    if (Number.isInteger(styleIndex) && styleIndex >= 1 && styleIndex <= styles.length) {
      designStyle = styles[styleIndex - 1].id;
    } else {
      designStyle = styles[0]?.id || designStyle;
    }

    const fw = await ask("\nChoose preview implementation: [1] react / [2] vue / [3] html (default 1): ");
    switch (fw.trim()) {
      case "2":
        framework = "vue";
        break;
      case "3":
        framework = "html";
        break;
      default:
        framework = "react";
    }
  } else {
    process.env.UI_UX_PRO_MAX_AVAILABLE = "false";
    console.log("\nDevelopment mode will read development-code-template for production module structure.");
    const ff = await ask("Choose frontend framework: [1] react / [2] vue (default 1): ");
    framework = ff.trim() === "2" ? "vue" : "react";

    const bf = await ask("Choose backend framework: [1] express / [2] fastify / [3] koa (default 1): ");
    switch (bf.trim()) {
      case "2":
        backendFramework = "fastify";
        break;
      case "3":
        backendFramework = "koa";
        break;
      default:
        backendFramework = "express";
    }
  }

  console.log("\nConfiguration");
  console.log(`Mode: ${mode}`);
  if (mode === "preview") {
    console.log(`Design style: ${designStyle}`);
  }
  console.log(`Frontend/preview framework: ${framework}`);
  if (mode === "development") {
    console.log(`Backend framework: ${backendFramework}`);
  }
  console.log(`PRD: ${resolve(prdPath)}`);

  const confirm = await ask("\nStart pipeline? [Y/n] ");
  rl.close();

  if (confirm.trim().toLowerCase() === "n") {
    console.log("Cancelled.");
    process.exit(0);
  }

  process.env.PIPELINE_MODE = mode;
  process.env.PREVIEW_FRAMEWORK = framework;
  process.env.DESIGN_STYLE_PRESET = designStyle;
  process.env.DEV_FRONTEND_FRAMEWORK = framework;
  process.env.DEV_BACKEND_FRAMEWORK = backendFramework;
  process.env.ASK_DEPLOY = "true";
  process.env.DEPLOY_TO_VERCEL = "false";

  const args = [
    "npx",
    "tsx",
    "src/pipeline.ts",
    `"${resolve(prdPath)}"`,
    "--mode",
    mode,
    "--framework",
    framework,
  ];

  if (mode === "development") {
    args.push("--backend", backendFramework);
  } else {
    args.push("--style", designStyle);
  }

  execSync(args.join(" "), {
    cwd: projectRoot,
    stdio: "inherit",
    env: { ...process.env },
  });
}

main().catch((err) => {
  rl.close();
  console.error("\nInteractive workflow failed:", err);
  process.exit(1);
});
