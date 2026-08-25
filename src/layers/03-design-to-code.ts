/**
 * 第 3 层：设计 → 代码自动转换
 *
 * 两种模式：
 *   preview:     快速预览，逐组件生成（React/Vue/HTML），可直接部署查看
 *   development: 可交付代码，生成完整前端+后端项目结构，开发可直接集成
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { config } from "../config.js";
import { callAI } from "../api.js";
import { formatDesignStyleForPrompt, loadDesignStyle } from "../design-styles.js";
import { renderTemplate, renderConfigFile, briefToTemplateVars } from "../template-engine.js";
import { resolveGsapSkillProfile, writeGsapSkillManifest, type GsapSkillProfile } from "../gsap-skills.js";
import {
  DesignBrief as DesignBriefSchema,
  DesignOutput,
  type DesignBrief,
  CodeOutput,
  BackendCodeOutput,
  DevProjectOutput,
  ComponentSpec,
} from "../types.js";

export interface DesignToCodeOptions {
  iterationFeedback?: string;
}

// ========== System Prompts ==========

const REACT_SYSTEM = `你是资深 React 前端工程师。生成高质量 React + TypeScript + Tailwind CSS 代码。
技术栈：React 18、函数组件+Hooks、完整 Props 类型、处理所有状态（加载/空/错误）。
直接输出 .tsx 文件代码（用 \`\`\`tsx 包裹）。`;

const VUE_SYSTEM = `你是资深 Vue 前端工程师。生成高质量 Vue 3 + TypeScript + Tailwind CSS 代码。
技术栈：Vue 3 Composition API、<script setup lang="ts">、完整 Props/Emits 类型、处理所有状态。
直接输出 .vue SFC 文件代码（用 \`\`\`vue 包裹，包含 template/script/style 三部分）。`;

const HTML_SYSTEM = `你是资深 UI 工程师。生成高质量、可直接预览的 HTML 页面代码。
技术栈：HTML5 + CSS3（内嵌 <style>） + Vanilla JS（内嵌 <script>）+ GSAP 3.15；仅 GSAP 可通过 jsDelivr CDN 加载。
要求：深色科技风、可交互、所有状态（加载/空/错误）具备。直接输出完整 .html 文件（用 \`\`\`html 包裹）。`;

const DEV_SYSTEM = `你是资深全栈工程师。生成可直接交付开发的完整项目代码。
要求：
1. 代码符合团队规范（${config.codeStandards.indent}缩进${config.codeStandards.indentSize}字符、${config.codeStandards.quotes}引号、${config.codeStandards.semi ? "分号" : "无分号"}）
2. 组件命名：${config.codeStandards.componentNaming}，文件命名：${config.codeStandards.fileNaming}
3. 样式方案：${config.codeStandards.cssApproach === "tailwind" ? "Tailwind CSS" : config.codeStandards.cssApproach}
4. ${config.codeStandards.typescript ? "TypeScript 严格模式" : "JavaScript"}
5. 包含完整类型定义、错误边界、API 层封装、通用工具函数
6. 代码可直接集成到现有项目，遵循标准项目结构`;

const BACKEND_SYSTEM = `你是资深后端工程师。生成生产级 Node.js 后端代码。
技术栈：${config.pipeline.development.backendFramework}、${config.pipeline.development.backendLanguage}、${config.pipeline.development.orm}
要求：
1. RESTful API 设计，统一响应格式 { code, data, message }
2. 完整的错误处理和参数校验
3. 数据库模型和迁移文件
4. 中间件：认证、日志、错误处理、CORS
5. 环境变量配置
直接输出代码（用对应的代码块包裹）。`;

// ========== 框架分发 ==========

function getSystemPrompt(framework: string): string {
  switch (framework) {
    case "vue": return VUE_SYSTEM;
    case "html": return HTML_SYSTEM;
    default: return REACT_SYSTEM;
  }
}

function getFileExt(framework: string): string {
  switch (framework) {
    case "vue": return ".vue";
    case "html": return ".html";
    default: return ".tsx";
  }
}

function getCodeBlockTag(framework: string): string {
  switch (framework) {
    case "vue": return "vue";
    case "html": return "html";
    default: return "tsx";
  }
}

// ========== 预览模式：组件代码生成 ==========

async function generatePreviewComponent(
  pageName: string,
  component: ComponentSpec,
  brief: DesignBrief,
  framework: string,
  designStylePrompt = "",
  implementationContext = ""
): Promise<{ componentName: string; code: string; language: string }> {
  const prompt = `为以下组件生成完整 ${framework.toUpperCase()} 代码：

项目：${brief.project} | 风格：${brief.theme.style} | 主色：${brief.theme.colors.join("、")}
页面：${pageName}
组件：${component.name} [${component.type}] - ${component.description}
状态：${component.states.join("、") || "默认"}
交互：${component.interactions.join("；") || "无特殊交互"}

${framework === "html" ? "生成一个可直接在浏览器打开的 HTML 文件，包含该组件的完整演示。" : "直接输出组件代码："}`;

  const result = await callAI({
    system: getSystemPrompt(framework),
    prompt: `${prompt}

${designStylePrompt}

${implementationContext}

Additional preview implementation requirements:
- Build as part of a coherent section-based page composition. Use the Section Library modules that best fit this component/page.
- Treat tokens as defaults, not fixed brand colors. PRD/brand colors override token colors when provided.
- Follow the selected design style preset layout rules, component recipes, motion rules, and negative rules.
- The component must look like part of a coherent designed page section, not a generic component sample.
- Use realistic placeholder data and polished states.
- Keep text readable and contained on mobile and desktop.
- Avoid decorative blobs, card-inside-card layouts, and one-color generic palettes unless the preset explicitly allows them.`,
  });

  const codeBlockTag = getCodeBlockTag(framework);
  let code = result.content;
  const codeMatch = result.content.match(
    new RegExp(`\`\`\`(?:${codeBlockTag}|typescript|javascript|jsx)?\\s*([\\s\\S]*?)\`\`\``)
  );
  if (codeMatch) {
    code = codeMatch[1].trim();
  }
  code = code.replace(/^```(?:\w+)?\s*/i, "").replace(/\s*```$/i, "").trim();

  return {
    componentName: component.name.replace(/[^a-zA-Z0-9]/g, "") || "Component",
    code,
    language: getCodeBlockTag(framework),
  };
}

// ========== 开发模式：完整项目生成 ==========

async function generateDevFrontendProject(
  brief: DesignBrief,
  iterationFeedback = "",
  gsapProfile?: GsapSkillProfile
): Promise<CodeOutput[]> {
  const outputs: CodeOutput[] = [];
  const framework = config.pipeline.development.frontendFramework;
  const baseDir = resolve(config.paths.output, brief.project, "dev-project", "frontend");
  const srcDir = resolve(baseDir, "src");
  const isTS = config.codeStandards.typescript;
  const ext = isTS ? "ts" : "js";
  const tsxExt = isTS ? "tsx" : "jsx";

  console.log("  [前端] 生成项目架构...\n");

  // 目录结构
  const dirs = [
    "src/components", "src/pages", "src/hooks", "src/services",
    "src/types", "src/utils", "src/assets", "src/layouts",
    "src/store", "public",
  ];
  for (const d of dirs) mkdirSync(resolve(baseDir, d), { recursive: true });

  // --- 类型定义 ---
  const tplVars = briefToTemplateVars(brief);
  const typesCode = renderTemplate(
    "frontend", framework, "types.ts.tpl",
    tplVars,
    // fallback — 内联默认类型
    [
      `// ${brief.project} - 全局类型定义`,
      `// 自动生成，请在开发中根据实际数据结构调整`,
      ``,
      `export interface ApiResponse<T = unknown> {`,
      `  code: number;`,
      `  data: T;`,
      `  message: string;`,
      `}`,
      ``,
      `export interface PaginatedData<T> {`,
      `  items: T[];`,
      `  total: number;`,
      `  page: number;`,
      `  pageSize: number;`,
      `}`,
      ``,
      `export interface PaginatedResponse<T> extends ApiResponse<T[]> {`,
      `  total: number;`,
      `  page: number;`,
      `  pageSize: number;`,
      `}`,
    ].join("\n")
  );

  const typesPath = resolve(srcDir, "types", `index.${ext}`);
  writeFileSync(typesPath, typesCode, "utf-8");
  outputs.push({ pageName: "shared", componentName: "types", code: typesCode, language: ext as any, filePath: typesPath, framework: framework as any });

  // --- API 服务层 ---
  const apiCode = renderTemplate(
    "frontend", framework, "api-service.ts.tpl",
    tplVars,
    // fallback
    `import type { ApiResponse } from '../types';\n\nconst BASE_URL = import.meta.env.VITE_API_BASE_URL || '';\n\nexport const api = {\n  get: <T>(path: string) => fetch(\`\${BASE_URL}\${path}\`).then(r => r.json()),\n  post: <T>(path: string, data: unknown) => fetch(\`\${BASE_URL}\${path}\`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),\n  put: <T>(path: string, data: unknown) => fetch(\`\${BASE_URL}\${path}\`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),\n  delete: <T>(path: string) => fetch(\`\${BASE_URL}\${path}\`, { method: 'DELETE' }).then(r => r.json()),\n};`
  );
  const apiPath = resolve(srcDir, "services", `api.${ext}`);
  writeFileSync(apiPath, apiCode, "utf-8");
  outputs.push({ pageName: "shared", componentName: "api", code: apiCode, language: ext as any, filePath: apiPath, framework: framework as any });

  // --- 错误边界 ---
  const errorBoundaryCode = framework === "react"
    ? [
      `import { Component, type ReactNode } from 'react';`,
      ``,
      `interface Props { children: ReactNode; fallback?: ReactNode; }`,
      `interface State { hasError: boolean; error?: Error; }`,
      ``,
      `export class ErrorBoundary extends Component<Props, State> {`,
      `  state: State = { hasError: false };`,
      `  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }`,
      `  render() {`,
      `    if (this.state.hasError) {`,
      `      return this.props.fallback || (`,
      `        <div className="flex items-center justify-center min-h-[400px] text-slate-400">`,
      `          <div className="text-center">`,
      `            <p className="text-red-400 text-lg font-semibold mb-2">页面加载异常</p>`,
      `            <p className="text-sm mb-4">{this.state.error?.message}</p>`,
      `            <button onClick={() => this.setState({ hasError: false })}`,
      `              className="px-4 py-2 bg-slate-700 rounded-md hover:bg-slate-600">重试</button>`,
      `          </div>`,
      `        </div>`,
      `      );`,
      `    }`,
      `    return this.props.children;`,
      `  }`,
      `}`,
    ]
    : [
      `<template>`,
      `  <div v-if="hasError" class="flex items-center justify-center min-h-[400px] text-slate-400">`,
      `    <div class="text-center">`,
      `      <p class="text-red-400 text-lg font-semibold mb-2">页面加载异常</p>`,
      `      <p class="text-sm mb-4">{{ error?.message }}</p>`,
      `      <button @click="reset" class="px-4 py-2 bg-slate-700 rounded-md hover:bg-slate-600">重试</button>`,
      `    </div>`,
      `  </div>`,
      `  <slot v-else />`,
      `</template>`,
      ``,
      `<script setup lang="ts">`,
      `import { ref, onErrorCaptured } from 'vue';`,
      `const hasError = ref(false);`,
      `const error = ref<Error>();`,
      `onErrorCaptured((err) => { hasError.value = true; error.value = err; return false; });`,
      `function reset() { hasError.value = false; error.value = undefined; }`,
      `</script>`,
    ];

  const errorPath = resolve(srcDir, "components", `ErrorBoundary.${framework === "vue" ? "vue" : tsxExt}`);
  writeFileSync(errorPath, errorBoundaryCode.join("\n"), "utf-8");
  outputs.push({ pageName: "shared", componentName: "ErrorBoundary", code: errorBoundaryCode.join("\n"), language: framework === "vue" ? "vue" : tsxExt as any, filePath: errorPath, framework: framework as any });

  // --- 布局组件 ---
  const layoutCode = framework === "react"
    ? [
      `import { Outlet } from 'react-router-dom';`,
      `import { ErrorBoundary } from '../components/ErrorBoundary';`,
      ``,
      `export function AppLayout() {`,
      `  return (`,
      `    <div className="min-h-screen bg-slate-950 text-slate-100">`,
      `      <ErrorBoundary>`,
      `        <Outlet />`,
      `      </ErrorBoundary>`,
      `    </div>`,
      `  );`,
      `}`,
    ]
    : [
      `<template>`,
      `  <div class="min-h-screen bg-slate-950 text-slate-100">`,
      `    <ErrorBoundary>`,
      `      <router-view />`,
      `    </ErrorBoundary>`,
      `  </div>`,
      `</template>`,
      ``,
      `<script setup lang="ts">`,
      `import ErrorBoundary from '../components/ErrorBoundary.vue';`,
      `</script>`,
    ];

  const layoutPath = resolve(srcDir, "layouts", `AppLayout.${framework === "vue" ? "vue" : tsxExt}`);
  writeFileSync(layoutPath, layoutCode.join("\n"), "utf-8");
  outputs.push({ pageName: "shared", componentName: "AppLayout", code: layoutCode.join("\n"), language: framework === "vue" ? "vue" : tsxExt as any, filePath: layoutPath, framework: framework as any });

  // --- 通用工具函数 ---
  const utilsCode = [
    `export function formatPercent(value: number, decimals = 2): string {`,
    `  return (value * 100).toFixed(decimals) + '%';`,
    `}`,
    ``,
    `export function formatNumber(value: number): string {`,
    `  return new Intl.NumberFormat('zh-CN').format(value);`,
    `}`,
    ``,
    `export function formatDuration(ms: number): string {`,
    `  if (ms < 1000) return ms + 'ms';`,
    `  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';`,
    `  if (ms < 3600000) return (ms / 60000).toFixed(1) + 'min';`,
    `  return (ms / 3600000).toFixed(1) + 'h';`,
    `}`,
    ``,
    `export function classNames(...classes: (string | false | null | undefined)[]): string {`,
    `  return classes.filter(Boolean).join(' ');`,
    `}`,
    ``,
    `export function getSeverityColor(severity: string): string {`,
    `  const map: Record<string, string> = {`,
    `    critical: '#ef4444', major: '#f59e0b',`,
    `    minor: '#06b6d4', info: '#94a3b8',`,
    `  };`,
    `  return map[severity] || '#94a3b8';`,
    `}`,
  ];
  const utilsPath = resolve(srcDir, "utils", `index.${ext}`);
  writeFileSync(utilsPath, utilsCode.join("\n"), "utf-8");
  outputs.push({ pageName: "shared", componentName: "utils", code: utilsCode.join("\n"), language: ext as any, filePath: utilsPath, framework: framework as any });

  // --- 为每个页面的每个组件生成代码 ---
  console.log("  [前端] 生成页面组件...\n");
  const allComponents: (ComponentSpec & { pageName: string })[] = [
    ...brief.pages.flatMap((p) => p.components.map((c) => ({ ...c, pageName: p.name }))),
    ...brief.sharedComponents.map((c) => ({ ...c, pageName: "shared" })),
  ];

  let count = 0;
  const total = allComponents.length;
  for (const comp of allComponents) {
    count++;
    console.log(`    [${count}/${total}] ${comp.name} (${comp.pageName})`);

    try {
      const result = await generateDevComponent(comp, brief, framework, iterationFeedback, gsapProfile?.prompt || "");
      const pageDir = resolve(srcDir, "components", comp.pageName.replace(/[^a-zA-Z0-9一-龥]/g, "_"));
      mkdirSync(pageDir, { recursive: true });
      const fname = `${result.componentName}.${getFileExt(framework).slice(1)}`;
      const fpath = resolve(pageDir, fname);
      writeFileSync(fpath, result.code, "utf-8");

      outputs.push({
        pageName: comp.pageName,
        componentName: result.componentName,
        code: result.code,
        language: getCodeBlockTag(framework) as any,
        filePath: fpath,
        framework: framework as any,
      });
      console.log(`      ✓ ${fname}`);
    } catch (err) {
      console.log(`      ✗ 失败: ${err}`);
    }
  }

  // --- 页面入口 index.tsx/vue ---
  for (const page of brief.pages) {
    const pageComps = outputs.filter((o) => o.pageName === page.name);
    if (pageComps.length === 0) continue;
    const pageDir = resolve(srcDir, "pages", page.name.replace(/[^a-zA-Z0-9一-龥]/g, "_"));
    mkdirSync(pageDir, { recursive: true });
    const pageCode = generateDevPage(page.name, pageComps, framework);
    const pagePath = resolve(pageDir, `index.${framework === "vue" ? "vue" : tsxExt}`);
    writeFileSync(pagePath, pageCode, "utf-8");
    outputs.push({ pageName: page.name, componentName: "index", code: pageCode, language: framework === "vue" ? "vue" : tsxExt as any, filePath: pagePath, framework: framework as any });
  }

  // --- 路由配置 ---
  const routerCode = generateDevRouter(brief, framework, isTS);
  const routerPath = resolve(srcDir, `router.${tsxExt}`);
  writeFileSync(routerPath, routerCode, "utf-8");
  outputs.push({ pageName: "shared", componentName: "router", code: routerCode, language: tsxExt as any, filePath: routerPath, framework: framework as any });

  // --- 入口文件 ---
  const entryCode = renderTemplate(
    "frontend", framework, `entry.${framework === "vue" ? "ts" : "tsx"}.tpl`,
    tplVars,
    framework === "vue"
      ? `import { createApp } from 'vue';\nimport App from './layouts/AppLayout.vue';\nimport router from './router';\nimport './index.css';\n\ncreateApp(App).use(router).mount('#app');`
      : `import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport { AppRouter } from './router';\nimport './index.css';\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <AppRouter />\n  </StrictMode>\n);`
  );
  const entryPath = resolve(srcDir, `main.${tsxExt}`);
  writeFileSync(entryPath, entryCode, "utf-8");
  outputs.push({ pageName: "shared", componentName: "main", code: entryCode, language: tsxExt as any, filePath: entryPath, framework: framework as any });

  // --- package.json ---
  const pkg = framework === "vue"
    ? { name: brief.project, version: "0.1.0", type: "module", scripts: { dev: "vite", build: "vue-tsc && vite build", preview: "vite preview" }, dependencies: { vue: "^3.5.0", "vue-router": "^4.4.0", gsap: "^3.15.0" }, devDependencies: { "@vitejs/plugin-vue": "^5.2.0", typescript: "~5.7.0", vite: "^6.0.0", "vue-tsc": "^2.2.0", tailwindcss: "^3.4.0", postcss: "^8.4.0", autoprefixer: "^10.4.0" } }
    : { name: brief.project, version: "0.1.0", type: "module", scripts: { dev: "vite", build: "tsc && vite build", preview: "vite preview" }, dependencies: { react: "^18.3.1", "react-dom": "^18.3.1", "react-router-dom": "^6.28.0", gsap: "^3.15.0", "@gsap/react": "^2.1.2" }, devDependencies: { "@types/react": "^18.3.0", "@types/react-dom": "^18.3.0", "@vitejs/plugin-react": "^4.3.0", typescript: "~5.7.0", vite: "^6.0.0", tailwindcss: "^3.4.0", postcss: "^8.4.0", autoprefixer: "^10.4.0" } };

  writeFileSync(resolve(baseDir, "package.json"), JSON.stringify(pkg, null, 2), "utf-8");

  console.log(`\n  [前端] 完成: ${outputs.length} 个文件 → ${baseDir}\n`);
  return outputs;
}

async function generateDevComponent(
  comp: ComponentSpec & { pageName: string },
  brief: DesignBrief,
  framework: string,
  iterationFeedback = "",
  gsapSkillPrompt = ""
): Promise<{ componentName: string; code: string }> {
  const prompt = `生成符合团队规范的 ${framework.toUpperCase()} 组件代码：

项目：${brief.project} | 风格：${brief.theme.style}
页面：${comp.pageName}
组件：${comp.name} [${comp.type}] - ${comp.description}
状态：${comp.states.join("、") || "默认"}
交互：${comp.interactions.join("；") || "无"}
${comp.apiEndpoint ? `API 端点：${comp.apiEndpoint}` : ""}
${comp.dataModel ? `数据模型：${comp.dataModel}` : ""}

规范：${config.codeStandards.componentNaming}命名、${config.codeStandards.cssApproach}样式、${config.codeStandards.typescript ? "TypeScript严格模式" : "JavaScript"}
要求：完整 Props 类型、错误处理、所有状态覆盖、可访问性（aria-label）、性能优化（React.memo 或 computed）。

${iterationFeedback ? `上一轮评审修复要求（必须逐条落实）：\n${iterationFeedback}` : ""}

${gsapSkillPrompt}`;

  const result = await callAI({
    system: DEV_SYSTEM,
    prompt,
  });

  const codeBlockTag = getCodeBlockTag(framework);
  let code = result.content;
  const codeMatch = result.content.match(
    new RegExp(`\`\`\`(?:${codeBlockTag}|typescript|javascript)?\\s*([\\s\\S]*?)\`\`\``)
  );
  if (codeMatch) code = codeMatch[1].trim();
  code = code.replace(/^```(?:\w+)?\s*/i, "").replace(/\s*```$/i, "").trim();

  return {
    componentName: comp.name.replace(/[^a-zA-Z0-9]/g, "") || "Component",
    code,
  };
}

function generateDevPage(
  pageName: string,
  components: CodeOutput[],
  framework: string
): string {
  const comps = components.filter((c) => c.componentName !== "index");
  const isTS = config.codeStandards.typescript;

  if (framework === "vue") {
    const imports = comps.map((c) => `import ${c.componentName} from '../components/${pageName}/${c.componentName}.vue';`).join("\n");
    const tags = comps.map((c) => `    <${c.componentName} />`).join("\n");
    return `<template>\n  <div class="page-${pageName.toLowerCase()}">\n${tags}\n  </div>\n</template>\n\n<script setup lang="ts">\n${imports}\n</script>`;
  }

  const imports = comps.map((c) => `import { ${c.componentName} } from '../components/${pageName}/${c.componentName}';`).join("\n");
  const tags = comps.map((c) => `        <${c.componentName} />`).join("\n");
  return `import type { FC } from 'react';\n\n${imports}\n\nexport const ${pageName}Page: FC = () => {\n  return (\n    <div className="min-h-screen">\n${tags}\n    </div>\n  );\n};\n\nexport default ${pageName}Page;`;
}

function generateDevRouter(brief: DesignBrief, framework: string, isTS: boolean): string {
  if (framework === "vue") {
    const routes = brief.pages.map((p) => `  { path: '${p.route}', name: '${p.name}', component: () => import('./pages/${p.name}/index.vue') }`).join(",\n");
    return `import { createRouter, createWebHistory } from 'vue-router';\n\nconst routes = [\n${routes}\n];\n\nexport default createRouter({\n  history: createWebHistory(),\n  routes,\n});`;
  }
  const imports = brief.pages.map((p) => `import ${p.name}Page from './pages/${p.name}/index';`).join("\n");
  const routes = brief.pages.map((p) => `        <Route path="${p.route}" element={<${p.name}Page />} />`).join("\n");
  return `import { BrowserRouter, Routes, Route } from 'react-router-dom';\n${imports}\n\nexport function AppRouter() {\n  return (\n    <BrowserRouter>\n      <Routes>\n${routes}\n      </Routes>\n    </BrowserRouter>\n  );\n}`;
}

function generateDevEntry(brief: DesignBrief, framework: string, isTS: boolean): string {
  if (framework === "vue") {
    return `import { createApp } from 'vue';\nimport App from './layouts/AppLayout.vue';\nimport router from './router';\nimport './assets/main.css';\n\ncreateApp(App).use(router).mount('#app');`;
  }
  return `import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport { AppRouter } from './router';\nimport './assets/main.css';\n\ncreateRoot(document.getElementById('root')!).render(\n  <StrictMode>\n    <AppRouter />\n  </StrictMode>\n);`;
}

// ========== 开发模式：后端项目生成 ==========

async function generateDevBackendProject(brief: DesignBrief): Promise<BackendCodeOutput[]> {
  const outputs: BackendCodeOutput[] = [];
  const bf = config.pipeline.development.backendFramework;
  const lang = config.pipeline.development.backendLanguage;
  const isTS = lang === "typescript";
  const ext = isTS ? "ts" : "js";
  const baseDir = resolve(config.paths.output, brief.project, "dev-project", "backend");
  const srcDir = resolve(baseDir, "src");
  const tplVars = briefToTemplateVars(brief);

  console.log("  [后端] 生成项目架构...\n");

  const dirs = ["src/routes", "src/controllers", "src/models", "src/middleware", "src/config", "src/types", "src/utils", "prisma"];
  for (const d of dirs) mkdirSync(resolve(baseDir, d), { recursive: true });

  // --- package.json ---
  const pkg = {
    name: `${brief.project}-api`,
    version: "0.1.0",
    scripts: { dev: "tsx watch src/index.ts", build: "tsc", start: "node dist/index.js", "db:migrate": "prisma migrate dev", "db:generate": "prisma generate" },
    dependencies: { [bf]: bf === "express" ? "^4.21.0" : bf === "fastify" ? "^5.0.0" : "^2.15.0", "cors": "^2.8.5", "helmet": "^8.0.0", "morgan": "^1.10.0" },
    devDependencies: { typescript: "~5.7.0", tsx: "^4.19.0", "@types/node": "^22.0.0", "@types/cors": "^2.8.17", "@types/morgan": "^1.9.9", prisma: "^6.0.0", "@prisma/client": "^6.0.0" },
  };
  writeFileSync(resolve(baseDir, "package.json"), JSON.stringify(pkg, null, 2), "utf-8");

  // --- tsconfig.json ---
  writeFileSync(resolve(baseDir, "tsconfig.json"), JSON.stringify({
    compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", outDir: "dist", rootDir: "src", strict: true, esModuleInterop: true, skipLibCheck: true, declaration: true },
    include: ["src"],
  }, null, 2), "utf-8");

  // --- 类型定义 ---
  const types = [
    `export interface ApiResponse<T = unknown> {`,
    `  code: number;`,
    `  data: T;`,
    `  message: string;`,
    `}`,
    ``,
    `export interface PaginatedData<T> {`,
    `  items: T[];`,
    `  total: number;`,
    `  page: number;`,
    `  pageSize: number;`,
    `}`,
    ``,
    `export interface UserInfo {`,
    `  id: string;`,
    `  username: string;`,
    `  role: 'admin' | 'operator' | 'viewer';`,
    `}`,
  ];
  writeFileSync(resolve(srcDir, "types", `index.${ext}`), types.join("\n"), "utf-8");
  outputs.push({ module: "types", fileName: "index", code: types.join("\n"), language: isTS ? "ts" : "js", filePath: resolve(srcDir, "types", `index.${ext}`), framework: bf });

  // --- 配置 ---
  const configCode = [
    `import dotenv from 'dotenv';`,
    `dotenv.config();`,
    ``,
    `export const serverConfig = {`,
    `  port: parseInt(process.env.PORT || '3001'),`,
    `  host: process.env.HOST || '0.0.0.0',`,
    `  corsOrigin: process.env.CORS_ORIGIN || '*',`,
    `  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',`,
    `  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/mydb',`,
    `};`,
  ];
  writeFileSync(resolve(srcDir, "config", `index.${ext}`), configCode.join("\n"), "utf-8");
  outputs.push({ module: "config", fileName: "index", code: configCode.join("\n"), language: isTS ? "ts" : "js", filePath: resolve(srcDir, "config", `index.${ext}`), framework: bf });

  // --- 中间件 ---
  const authMW = [
    `import type { Request, Response, NextFunction } from 'express';`,
    `import jwt from 'jsonwebtoken';`,
    `import { serverConfig } from '../config';`,
    ``,
    `export function authMiddleware(req: Request, res: Response, next: NextFunction) {`,
    `  const token = req.headers.authorization?.replace('Bearer ', '');`,
    `  if (!token) {`,
    `    res.status(401).json({ code: 401, data: null, message: '未登录' });`,
    `    return;`,
    `  }`,
    `  try {`,
    `    const decoded = jwt.verify(token, serverConfig.jwtSecret);`,
    `    (req as any).user = decoded;`,
    `    next();`,
    `  } catch {`,
    `    res.status(401).json({ code: 401, data: null, message: 'Token 无效或已过期' });`,
    `  }`,
    `}`,
  ];
  writeFileSync(resolve(srcDir, "middleware", `auth.${ext}`), authMW.join("\n"), "utf-8");
  outputs.push({ module: "middleware", fileName: "auth", code: authMW.join("\n"), language: isTS ? "ts" : "js", filePath: resolve(srcDir, "middleware", `auth.${ext}`), framework: bf });

  const errorHandler = [
    `import type { Request, Response, NextFunction } from 'express';`,
    ``,
    `export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {`,
    `  console.error('[Error]', err.message, err.stack);`,
    `  res.status(500).json({`,
    `    code: 500,`,
    `    data: null,`,
    `    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,`,
    `  });`,
    `}`,
  ];
  writeFileSync(resolve(srcDir, "middleware", `errorHandler.${ext}`), errorHandler.join("\n"), "utf-8");
  outputs.push({ module: "middleware", fileName: "errorHandler", code: errorHandler.join("\n"), language: isTS ? "ts" : "js", filePath: resolve(srcDir, "middleware", `errorHandler.${ext}`), framework: bf });

  // --- Prisma Schema ---
  const prismaSchema = [
    `generator client {`,
    `  provider = "prisma-client-js"`,
    `}`,
    ``,
    `datasource db {`,
    `  provider = "postgresql"`,
    `  url      = env("DATABASE_URL")`,
    `}`,
    ``,
    `model Server {`,
    `  id        String   @id @default(cuid())`,
    `  hostname  String`,
    `  ip        String`,
    `  status    String   @default("online")`,
    `  cpuUsage  Float?`,
    `  memUsage  Float?`,
    `  diskUsage Float?`,
    `  clusterId String?`,
    `  createdAt DateTime @default(now())`,
    `  updatedAt DateTime @updatedAt`,
    `}`,
    ``,
    `model Alert {`,
    `  id          String   @id @default(cuid())`,
    `  title       String`,
    `  severity    String   @default("info")`,
    `  status      String   @default("active")`,
    `  source      String?`,
    `  count       Int      @default(1)`,
    `  resolvedAt  DateTime?`,
    `  createdAt   DateTime @default(now())`,
    `}`,
    ``,
    `model Ticket {`,
    `  id          String   @id @default(cuid())`,
    `  title       String`,
    `  description String?`,
    `  status      String   @default("open")`,
    `  priority    String   @default("medium")`,
    `  assignee    String?`,
    `  alertId     String?`,
    `  createdAt   DateTime @default(now())`,
    `  updatedAt   DateTime @updatedAt`,
    `  comments    Comment[]`,
    `}`,
    ``,
    `model Comment {`,
    `  id        String   @id @default(cuid())`,
    `  content   String`,
    `  author    String?`,
    `  ticketId  String`,
    `  ticket    Ticket   @relation(fields: [ticketId], references: [id])`,
    `  createdAt DateTime @default(now())`,
    `}`,
  ];
  writeFileSync(resolve(baseDir, "prisma", "schema.prisma"), prismaSchema.join("\n"), "utf-8");
  outputs.push({ module: "prisma", fileName: "schema", code: prismaSchema.join("\n"), language: "json", filePath: resolve(baseDir, "prisma", "schema.prisma"), framework: bf });

  // --- 路由和控制器 ---
  for (const page of brief.pages) {
    const routeName = page.route.replace("/", "");
    const safeName = routeName.replace(/[^a-zA-Z0-9]/g, "");
    const lowerName = safeName.charAt(0).toLowerCase() + safeName.slice(1);

    const controllerVars = { ...tplVars, ModuleName: safeName, moduleName: lowerName };
    const controller = renderTemplate(
      "backend", bf, "controller.ts.tpl",
      controllerVars,
      // fallback
      `import type { Request, Response } from 'express';\n\nexport const ${routeName}Controller = {\n  async list(req: Request, res: Response) {\n    res.json({ code: 200, data: { items: [], total: 0 }, message: 'ok' });\n  },\n  async getById(req: Request, res: Response) {\n    res.json({ code: 200, data: { id: req.params.id }, message: 'ok' });\n  },\n  async create(req: Request, res: Response) {\n    res.status(201).json({ code: 201, data: req.body, message: '创建成功' });\n  },\n  async update(req: Request, res: Response) {\n    res.json({ code: 200, data: { id: req.params.id }, message: '更新成功' });\n  },\n  async delete(req: Request, res: Response) {\n    res.json({ code: 200, data: null, message: '删除成功' });\n  },\n};`
    );
    const ctrlPath = resolve(srcDir, "controllers", `${routeName}.${ext}`);
    writeFileSync(ctrlPath, controller, "utf-8");
    outputs.push({ module: "controllers", fileName: routeName, code: controller, language: isTS ? "ts" : "js", filePath: ctrlPath, framework: bf });

    const router = renderTemplate(
      "backend", bf, "route.ts.tpl",
      controllerVars,
      `import { Router } from 'express';\nimport { ${routeName}Controller } from '../controllers/${routeName}';\n\nconst router = Router();\n\nrouter.get('/', ${routeName}Controller.list);\nrouter.get('/:id', ${routeName}Controller.getById);\nrouter.post('/', ${routeName}Controller.create);\nrouter.put('/:id', ${routeName}Controller.update);\nrouter.delete('/:id', ${routeName}Controller.delete);\n\nexport default router;`
    );
    const routerPath = resolve(srcDir, "routes", `${routeName}.${ext}`);
    writeFileSync(routerPath, router, "utf-8");
    outputs.push({ module: "routes", fileName: routeName, code: router, language: isTS ? "ts" : "js", filePath: routerPath, framework: bf });
  }

  // --- 入口文件 ---
  const entry = renderTemplate(
    "backend", bf, "entry.ts.tpl",
    tplVars,
    // fallback
    [
      `import express from 'express';`,
      `import cors from 'cors';`,
      `import helmet from 'helmet';`,
      `import morgan from 'morgan';`,
      `import { serverConfig } from './config';`,
      `import { errorHandler } from './middleware/errorHandler';`,
      ``,
      brief.pages.map((p) => `import ${p.name}Router from './routes/${p.route.replace("/", "")}';`).join("\n"),
      ``,
      `const app = express();`,
      `app.use(helmet());`,
      `app.use(cors({ origin: serverConfig.corsOrigin }));`,
      `app.use(morgan('dev'));`,
      `app.use(express.json());`,
      ``,
      `app.get('/api/health', (_req, res) => res.json({ code: 200, data: { status: 'ok' }, message: 'ok' }));`,
      ``,
      brief.pages.map((p) => `app.use('/api${p.route}', ${p.name}Router);`).join("\n"),
      ``,
      `app.use(errorHandler);`,
      ``,
      `app.listen(serverConfig.port, serverConfig.host, () => console.log(\`🚀 http://\${serverConfig.host}:\${serverConfig.port}\`));`,
    ].join("\n")
  );
  writeFileSync(resolve(srcDir, "index.ts"), entry, "utf-8");
  outputs.push({ module: "index", fileName: "index", code: entry, language: "ts", filePath: resolve(srcDir, "index.ts"), framework: bf });

  // --- README ---
  const readme = `# ${brief.project} - 后端 API

## 技术栈

- ${bf} + ${lang} + ${config.pipeline.development.orm}
- PostgreSQL

## 快速启动

\`\`\`bash
cp .env.example .env          # 配置环境变量
npm install
npm run db:migrate            # 初始化数据库
npm run dev                   # 启动开发服务器 (http://localhost:3001)
\`\`\`

## API 概览

${brief.pages.map((p) => `- \`${p.route}\` — ${p.description}`).join("\n")}

## 目录结构

\`\`\`
src/
├── config/        # 配置
├── controllers/   # 控制器
├── middleware/    # 中间件（认证、错误处理）
├── models/        # 数据模型
├── routes/        # 路由
├── types/         # 类型定义
├── utils/         # 工具函数
└── index.ts       # 入口
prisma/
└── schema.prisma  # 数据库 Schema
\`\`\`
`;
  writeFileSync(resolve(baseDir, "README.md"), readme, "utf-8");

  console.log(`  [后端] 完成: ${outputs.length} 个文件 → ${baseDir}\n`);
  return outputs;
}

// ========== 主入口 ==========

function loadStitchDesignReferences(projectDir: string): string {
  const resultPath = resolve(projectDir, "stitch-prompts", "stitch-results.json");
  if (!existsSync(resultPath)) {
    if (process.env.REQUIRE_STITCH_RESULTS === "true") {
      throw new Error(`Stitch results are required but missing: ${resultPath}`);
    }
    console.log("Stitch result: not supplied; generating from PRD + style preset only.");
    return "## Design source status\nNo Stitch draft was supplied. Do not claim pixel fidelity to a Stitch design.";
  }

  const parsed = DesignOutput.array().safeParse(JSON.parse(readFileSync(resultPath, "utf-8")));
  if (!parsed.success) {
    throw new Error(`Invalid Stitch result file ${resultPath}: ${parsed.error.message}`);
  }

  const generated = parsed.data.filter((result) => result.status === "generated");
  console.log(`Stitch result: ${generated.length}/${parsed.data.length} generated page draft(s) supplied.`);
  return `## Stitch design references\n${generated.map((result) => [
    `- Page: ${result.pageName}`,
    result.stitchUrl ? `  Stitch URL: ${result.stitchUrl}` : "",
    result.screenshot ? `  Screenshot: ${result.screenshot}` : "",
  ].filter(Boolean).join("\n")).join("\n")}\nImplement these references faithfully where available.`;
}

export async function designToCode(briefPath: string, options: DesignToCodeOptions = {}): Promise<CodeOutput[]> {
  const mode = config.pipeline.mode;
  const brief = DesignBriefSchema.parse(JSON.parse(readFileSync(briefPath, "utf-8")));
  const projectDir = resolve(config.paths.output, brief.project);

  if (mode === "development") {
    return designToCodeDev(brief, projectDir, options.iterationFeedback);
  }
  return designToCodePreview(brief, projectDir, options.iterationFeedback);
}

/** 预览模式 */
async function designToCodePreview(brief: DesignBrief, projectDir: string, iterationFeedback = ""): Promise<CodeOutput[]> {
  const framework = config.pipeline.preview.framework;
  const style = loadDesignStyle(config.pipeline.preview.stylePreset);
  const designStylePrompt = formatDesignStyleForPrompt(style);
  const gsapProfile = resolveGsapSkillProfile(style.id, style.styleMarkdown, framework);
  writeGsapSkillManifest(projectDir, gsapProfile);
  console.log("═══════════════════════════════════════");
  console.log(`  第 3 层：设计 → 代码 (预览模式 · ${framework.toUpperCase()})`);
  console.log("═══════════════════════════════════════\n");

  const codeDir = resolve(projectDir, "generated-code", "src", "components");
  mkdirSync(codeDir, { recursive: true });
  console.log(`Design style preset: ${style.name} (${style.id})`);
  const designReferences = loadStitchDesignReferences(projectDir);
  const implementationContext = [
    designReferences,
    iterationFeedback ? `## Mandatory iteration fixes\n${iterationFeedback}` : "",
    gsapProfile.prompt,
  ].filter(Boolean).join("\n\n");
  if (iterationFeedback) console.log("Applying previous review feedback to every generated component.");
  console.log(`GSAP skills: ${gsapProfile.skillIds.join(", ")}`);

  const allComponents = [
    ...brief.pages.flatMap((p) => p.components.map((c) => ({ ...c, pageName: p.name }))),
    ...brief.sharedComponents.map((c) => ({ ...c, pageName: "shared" })),
  ];

  const total = allComponents.length;
  console.log(`[1/1] 生成 ${total} 个 ${framework.toUpperCase()} 组件...\n`);

  const outputs: CodeOutput[] = [];
  let count = 0;

  for (const comp of allComponents) {
    count++;
    process.stdout.write(`  [${count}/${total}] ${comp.name}... `);

    try {
      const result = await generatePreviewComponent(comp.pageName, comp, brief, framework, designStylePrompt, implementationContext);
      const pageDir = resolve(codeDir, comp.pageName.replace(/[^a-zA-Z0-9一-龥]/g, "_"));
      mkdirSync(pageDir, { recursive: true });
      const fname = `${result.componentName}${getFileExt(framework)}`;
      const fpath = resolve(pageDir, fname);
      writeFileSync(fpath, result.code, "utf-8");

      outputs.push({
        pageName: comp.pageName,
        componentName: result.componentName,
        code: result.code,
        language: getCodeBlockTag(framework) as any,
        filePath: fpath,
        framework: framework as any,
      });
      console.log(`✓ (${result.code.length} 字符)`);
    } catch (err) {
      console.log(`✗ ${err}`);
    }
  }

  // 页面组装
  for (const page of brief.pages) {
    const pageComps = outputs.filter((o) => o.pageName === page.name);
    if (pageComps.length === 0) continue;
    const pageDir = resolve(codeDir, page.name.replace(/[^a-zA-Z0-9一-龥]/g, "_"));
    const pageCode = generatePageAssembly(page.name, pageComps, framework);
    const pageExt = framework === "vue" ? ".vue" : framework === "html" ? ".html" : ".tsx";
    const pagePath = resolve(pageDir, `index${pageExt}`);
    writeFileSync(pagePath, pageCode, "utf-8");
    outputs.push({ pageName: page.name, componentName: "index", code: pageCode, language: framework === "vue" ? "vue" : framework === "html" ? "html" : "tsx", filePath: pagePath, framework: framework as any });
  }

  // HTML 模式：额外生成聚合文件
  if (framework === "html") {
    const combined = outputs.filter((o) => o.language === "html").map((o) => o.code).join("\n<hr>\n");
    const combinedPath = resolve(projectDir, "generated-code", "all-components.html");
    writeFileSync(combinedPath, combined, "utf-8");
    outputs.push({ pageName: "all", componentName: "combined", code: combined, language: "html", filePath: combinedPath, framework: "html" });
  }

  console.log(`\n✓ 代码已生成: ${codeDir}/`);
  console.log(`  框架: ${framework.toUpperCase()}  ·  组件: ${outputs.length} 个\n`);
  return outputs;
}

/** 开发模式 */
async function designToCodeDev(brief: DesignBrief, projectDir: string, iterationFeedback = ""): Promise<CodeOutput[]> {
  const ff = config.pipeline.development.frontendFramework;
  const bf = config.pipeline.development.backendFramework;
  const style = loadDesignStyle(config.pipeline.preview.stylePreset);
  const gsapProfile = resolveGsapSkillProfile(style.id, style.styleMarkdown, ff);
  writeGsapSkillManifest(projectDir, gsapProfile);
  console.log(`GSAP skills: ${gsapProfile.skillIds.join(", ")}`);

  console.log("═══════════════════════════════════════");
  console.log(`  第 3 层：设计 → 代码 (开发模式 · ${ff.toUpperCase()} + ${bf.toUpperCase()})`);
  console.log("═══════════════════════════════════════\n");

  // 前端项目
  console.log("[1/2] 生成前端项目...");
  const frontendOutputs = await generateDevFrontendProject(brief, iterationFeedback, gsapProfile);

  // 后端项目
  console.log("[2/2] 生成后端项目...");
  const backendOutputs = await generateDevBackendProject(brief);

  // 保存项目清单
  const devProjectDir = resolve(projectDir, "dev-project");
  const readmePath = resolve(devProjectDir, "README.md");
  const readme = generateDevReadme(brief);
  writeFileSync(readmePath, readme, "utf-8");

  console.log("═══════════════════════════════════════");
  console.log("  开发模式项目生成完毕");
  console.log(`  前端: ${devProjectDir}/frontend (${frontendOutputs.length} 文件)`);
  console.log(`  后端: ${devProjectDir}/backend (${backendOutputs.length} 文件)`);
  console.log(`  框架: ${ff.toUpperCase()} + ${bf.toUpperCase()}`);
  console.log(`  规范: ${config.codeStandards.typescript ? "TS" : "JS"}/${config.codeStandards.cssApproach}/${config.codeStandards.componentNaming}`);
  console.log("═══════════════════════════════════════\n");

  return [...frontendOutputs];
}

function generateDevReadme(brief: DesignBrief): string {
  return `# ${brief.project} — 开发项目

## 项目结构

\`\`\`
dev-project/
├── frontend/          # 前端 (${config.pipeline.development.frontendFramework.toUpperCase()} + ${config.codeStandards.typescript ? "TS" : "JS"})
│   └── src/
│       ├── components/   # 组件
│       ├── pages/        # 页面
│       ├── hooks/        # 自定义 Hooks
│       ├── services/     # API 层
│       ├── types/        # 类型定义
│       ├── utils/        # 工具函数
│       ├── layouts/      # 布局
│       └── assets/       # 静态资源
├── backend/           # 后端 (${config.pipeline.development.backendFramework.toUpperCase()} + ${config.pipeline.development.backendLanguage.toUpperCase()})
│   └── src/
│       ├── controllers/  # 控制器
│       ├── routes/       # 路由
│       ├── models/       # 数据模型
│       ├── middleware/    # 中间件
│       ├── types/        # 类型定义
│       ├── config/       # 配置
│       └── index.ts      # 入口
└── README.md
\`\`\`

## 快速启动

### 前端
\`\`\`bash
cd frontend
npm install
npm run dev       # http://localhost:5173
\`\`\`

### 后端
\`\`\`bash
cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run dev       # http://localhost:3001
\`\`\`

## 代码规范

| 规则 | 值 |
|------|-----|
| 缩进 | ${config.codeStandards.indent} / ${config.codeStandards.indentSize} 字符 |
| 引号 | ${config.codeStandards.quotes} |
| 分号 | ${config.codeStandards.semi} |
| 组件命名 | ${config.codeStandards.componentNaming} |
| 样式 | ${config.codeStandards.cssApproach} |
| TypeScript | ${config.codeStandards.typescript ? "严格模式" : "关闭"} |

## 页面路由

${brief.pages.map((p) => `| ${p.name} | ${p.route} | ${p.description} | ${p.components.length} 组件 |`).join("\n")}

---
*此项目由 AI 设计流水线自动生成，可直接交给前端/后端开发进行业务逻辑填充。*
`;
}

function generatePageAssembly(
  pageName: string,
  components: CodeOutput[],
  framework: string
): string {
  const comps = components.filter((c) => c.componentName !== "index");

  if (framework === "vue") {
    const imports = comps.map((c) => `import ${c.componentName} from './${c.componentName}.vue';`).join("\n");
    const tags = comps.map((c) => `    <${c.componentName} />`).join("\n");
    return `<template>\n  <div class="${pageName.toLowerCase()}-page">\n${tags}\n  </div>\n</template>\n\n<script setup lang="ts">\n${imports}\n</script>`;
  }

  if (framework === "html") {
    return `<!-- Page: ${pageName} -->\n<section class="${pageName.toLowerCase()}-page">\n  <h2>${pageName}</h2>\n  <!-- Components: ${comps.map((c) => c.componentName).join(", ")} -->\n</section>`;
  }

  // React
  const imports = comps.map((c) => `import { ${c.componentName} } from './${c.componentName}';`).join("\n");
  const tags = comps.map((c) => `      <${c.componentName} />`).join("\n");
  return `"use client";\n\n${imports}\n\nexport default function ${pageName.replace(/[^a-zA-Z0-9]/g, "")}Page() {\n  return (\n    <div className="min-h-screen bg-background">\n${tags}\n    </div>\n  );\n}`;
}

// 可直接运行
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes("03-design")) {
  const briefPath = process.argv[2] || resolve(config.paths.output, "../output/智能运维监控平台/design-brief.json");
  designToCode(briefPath).catch(console.error);
}
