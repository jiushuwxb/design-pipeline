import { dirname, resolve } from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import type { PipelineMode, PreviewFramework, BackendFramework, CodeStandards } from "./types.js";

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  try {
    const envPath = resolve(projectRoot, ".env");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env file not found, use system env
  }
}

loadEnv();

export const config = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    baseUrl: process.env.ANTHROPIC_BASE_URL || "https://api.deepseek.com/anthropic",
    model: process.env.ANTHROPIC_MODEL || "DeepSeek-V4-pro[1m]",
  },
  stitch: {
    apiKey: process.env.STITCH_API_KEY || "",
    mcpUrl: process.env.STITCH_MCP_URL || "http://localhost:3000/mcp",
  },
  deploy: {
    provider: process.env.DEPLOY_PROVIDER || "vercel",
    token: process.env.VERCEL_TOKEN || "",
    scope: process.env.VERCEL_SCOPE || "",
    enabled: process.env.DEPLOY_TO_VERCEL === "true",
  },
  pipeline: {
    maxIterations: 3,
    reviewThreshold: 80,
    mode: (process.env.PIPELINE_MODE as PipelineMode) || "preview",
    preview: {
      framework: (process.env.PREVIEW_FRAMEWORK as PreviewFramework) || "react",
      stylePreset: process.env.DESIGN_STYLE_PRESET || "premium-bento-saas",
    },
    development: {
      frontendFramework: (process.env.DEV_FRONTEND_FRAMEWORK as "react" | "vue") || "react",
      backendFramework: (process.env.DEV_BACKEND_FRAMEWORK as BackendFramework) || "express",
      backendLanguage: (process.env.DEV_BACKEND_LANGUAGE as "typescript" | "javascript") || "typescript",
      orm: (process.env.DEV_ORM as "prisma" | "drizzle" | "none") || "prisma",
    },
  },
  codeStandards: {
    indent: (process.env.CODE_INDENT as "spaces" | "tabs") || "spaces",
    indentSize: parseInt(process.env.CODE_INDENT_SIZE || "2"),
    quotes: (process.env.CODE_QUOTES as "single" | "double") || "single",
    semi: process.env.CODE_SEMI !== "false",
    componentNaming: (process.env.CODE_COMPONENT_NAMING as "PascalCase" | "kebab-case") || "PascalCase",
    fileNaming: (process.env.CODE_FILE_NAMING as "PascalCase" | "kebab-case" | "camelCase") || "PascalCase",
    cssApproach: (process.env.CODE_CSS_APPROACH as "tailwind" | "scss" | "css-modules" | "styled-components") || "tailwind",
    typescript: process.env.CODE_TYPESCRIPT !== "false",
  } satisfies CodeStandards,
  paths: {
    output: resolve(projectRoot, "output"),
    templates: resolve(projectRoot, "templates"),
    designStyles: resolve(projectRoot, "design-styles"),
  },
};
