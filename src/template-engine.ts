/**
 * 模板引擎
 * 优先读取 development-code-template/ 下的 .tpl 文件
 * 未找到则使用传入的 fallback
 *
 * 模板语法：
 *   {{VariableName}}          变量替换
 *   {{#each Items}}...{{/each}} 循环
 *   {{#if Condition}}...{{/if}} 条件
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";

const rootDir = resolve(dirname(import.meta.url || "."), "..");
const templateDir = resolve(rootDir, "development-code-template");

export interface TemplateVariables {
  [key: string]: string | number | boolean | TemplateVariables[] | undefined;
}

/**
 * 加载并渲染模板
 * @param type   模板类别: "frontend" | "backend"
 * @param system 系统: "react" | "vue" | "express" | "fastify" | "koa"
 * @param file   文件名: "component.tsx.tpl" | "entry.ts.tpl" 等
 * @param vars   模板变量
 * @param fallback 找不到模板时的后备内容
 */
export function renderTemplate(
  type: "frontend" | "backend",
  system: string,
  file: string,
  vars: TemplateVariables = {},
  fallback?: string
): string {
  const tplPath = resolve(templateDir, type, system, file);

  if (existsSync(tplPath)) {
    const raw = readFileSync(tplPath, "utf-8");
    return processTemplate(raw, vars);
  }

  if (fallback !== undefined) {
    return processTemplate(fallback, vars);
  }

  throw new Error(`Template not found: ${tplPath}`);
}

/**
 * 检查模板是否存在
 */
export function templateExists(type: string, system: string, file: string): boolean {
  return existsSync(resolve(templateDir, type, system, file));
}

/**
 * 获取模板原始内容（不渲染）
 */
export function getTemplateRaw(type: string, system: string, file: string): string | null {
  const tplPath = resolve(templateDir, type, system, file);
  if (existsSync(tplPath)) {
    return readFileSync(tplPath, "utf-8");
  }
  return null;
}

/**
 * 渲染配置类文件（package.json, tsconfig.json 等 JSON 文件）
 * 直接将 vars 作为 JSON 写入
 */
export function renderConfigFile(
  type: "frontend" | "backend",
  system: string,
  file: string,
  vars: TemplateVariables = {}
): string {
  const tplPath = resolve(templateDir, type, system, file);

  if (existsSync(tplPath)) {
    let raw = readFileSync(tplPath, "utf-8");
    // JSON 文件直接替换变量（不解析 each/if 等）
    for (const [key, value] of Object.entries(vars)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        raw = raw.replaceAll(`{{${key}}}`, String(value));
      }
    }
    return raw;
  }

  throw new Error(`Config file not found: ${tplPath}`);
}

// ========== 核心渲染逻辑 ==========

function processTemplate(raw: string, vars: TemplateVariables): string {
  let result = raw;

  // 1. {{#each Items}}...{{/each}} 循环
  result = result.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, key: string, body: string) => {
      const items = vars[key];
      if (!Array.isArray(items)) return "";
      return items
        .map((item) => {
          let rendered = body;
          if (typeof item === "object" && item !== null) {
            for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
              rendered = rendered.replaceAll(`{{${k}}}`, String(v ?? ""));
            }
          }
          return rendered;
        })
        .join("\n");
    }
  );

  // 2. {{#if Condition}}...{{/if}} 条件
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key: string, body: string) => {
      const val = vars[key];
      if (val === true || (typeof val === "number" && val > 0) || (typeof val === "string" && val.length > 0)) {
        return body;
      }
      return "";
    }
  );

  // 3. {{VariableName}} 简单替换
  for (const [key, value] of Object.entries(vars)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result = result.replaceAll(`{{${key}}}`, String(value));
    }
  }

  return result;
}

/**
 * 从 design-brief 的主题中提取模板变量
 */
export function briefToTemplateVars(brief: {
  project: string;
  theme: { style: string; colors: string[]; atmosphere: string };
  pages: { name: string; route: string; description: string; components: { name: string }[] }[];
}): TemplateVariables {
  return {
    ProjectName: brief.project,
    projectName: brief.project.replace(/\s+/g, "-").toLowerCase(),
    PrimaryColor: brief.theme.colors[0] || "#3b82f6",
    SecondaryColor: brief.theme.colors[1] || "#6366f1",
    AccentColor: brief.theme.colors[2] || "#f59e0b",
    DefaultRoute: brief.pages[0]?.route || "/",
    Pages: brief.pages.map((p) => ({
      PageName: p.name,
      Route: p.route,
      Description: p.description,
    })),
    Modules: brief.pages.map((p) => ({
      ModuleName: p.name.replace(/[^a-zA-Z0-9]/g, ""),
      moduleName: p.name.replace(/[^a-zA-Z0-9一-龥]/g, "").toLowerCase(),
      Route: p.route.replace("/", ""),
    })),
  };
}
