/**
 * 第 4 层：自动部署预览
 *
 * 预览模式：根据框架生成项目脚手架 → 复制代码 → 部署
 * 开发模式：直接部署 L3 已生成的完整项目
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { config } from "../config.js";
import type { DesignBrief } from "../types.js";

// ========== Vercel 部署（共享逻辑） ==========

function deployToVercel(projectDir: string, isStatic = false): string {
  if (!config.deploy.enabled) {
    console.log("  跳过 Vercel: DEPLOY_TO_VERCEL 未启用");
    return "";
  }

  if (!config.deploy.token || config.deploy.token === "your_vercel_token_here") {
    console.log("  ⚠ 跳过部署: VERCEL_TOKEN 未配置");
    return "";
  }

  try {
    const vercelJson = isStatic
      ? { outputDirectory: ".", cleanUrls: true }
      : { framework: "vite", buildCommand: "npm run build", outputDirectory: "dist", installCommand: "npm install" };
    writeFileSync(resolve(projectDir, "vercel.json"), JSON.stringify(vercelJson, null, 2), "utf-8");

    const scopeArg = config.deploy.scope ? `--scope ${config.deploy.scope}` : "";
    const cmd = `npx vercel deploy --cwd "${projectDir}" --token ${config.deploy.token} --yes ${scopeArg}`;

    console.log("  执行: vercel deploy --yes");
    const output = execSync(cmd, { cwd: projectDir, stdio: "pipe", timeout: 120_000 }).toString();

    const lines = output.trim().split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("https://") && trimmed.includes("vercel.app")) {
        return trimmed;
      }
    }
    console.log("  ⚠ 未解析到 URL，输出:");
    console.log(output.slice(-500));
  } catch (err) {
    console.log("  ✗ Vercel 部署失败:", String(err).slice(0, 500));
  }
  return "";
}

// ========== 项目脚手架生成 ==========

function scaffoldReactProject(deployDir: string, srcDir: string, brief: DesignBrief, pages: string[]) {
  const pkg = {
    name: brief.project.replace(/\s+/g, "-").toLowerCase(), private: true, version: "0.0.1", type: "module",
    scripts: { dev: "vite", build: "tsc && vite build", preview: "vite preview" },
    dependencies: { react: "^18.3.1", "react-dom": "^18.3.1", "react-router-dom": "^6.28.0" },
    devDependencies: { "@types/react": "^18.3.0", "@types/react-dom": "^18.3.0", "@vitejs/plugin-react": "^4.3.0", autoprefixer: "^10.4.0", postcss: "^8.4.0", tailwindcss: "^3.4.0", typescript: "^5.7.0", vite: "^6.0.0" },
  };
  writeFileSync(resolve(deployDir, "package.json"), JSON.stringify(pkg, null, 2), "utf-8");

  writeFileSync(resolve(deployDir, "vite.config.ts"),
    `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({\n  plugins: [react()],\n});\n`, "utf-8");

  writeFileSync(resolve(deployDir, "tsconfig.json"), JSON.stringify({
    compilerOptions: { target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "bundler", jsx: "react-jsx", strict: true, esModuleInterop: true, skipLibCheck: true }, include: ["src"],
  }, null, 2), "utf-8");

  writeFileSync(resolve(deployDir, "tailwind.config.js"),
    `export default {\n  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],\n  theme: { extend: { colors: { primary: "${brief.theme.colors[0] || "#3b82f6"}", secondary: "${brief.theme.colors[1] || "#6366f1"}", accent: "${brief.theme.colors[2] || "#f59e0b"}" } } },\n  plugins: [],\n};\n`, "utf-8");

  writeFileSync(resolve(deployDir, "postcss.config.js"),
    `export default {\n  plugins: { tailwindcss: {}, autoprefixer: {} },\n};\n`, "utf-8");

  writeFileSync(resolve(deployDir, "index.html"),
    `<!doctype html>\n<html lang="zh-CN">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${brief.project}</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n`, "utf-8");

  writeFileSync(resolve(srcDir, "index.css"),
    `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root { font-family: Inter, system-ui, sans-serif; }\nbody { margin: 0; min-height: 100vh; }\n`, "utf-8");

  const validPages = pages.filter((p) => p !== "shared");
  writeFileSync(resolve(srcDir, "main.tsx"),
    `import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport { BrowserRouter, Routes, Route } from "react-router-dom";\nimport "./index.css";\n`
    + validPages.map((p) => `import ${p}Page from "./components/${p}/index";`).join("\n") + `\n\n`
    + `createRoot(document.getElementById("root")!).render(\n  <StrictMode>\n    <BrowserRouter>\n      <Routes>\n`
    + validPages.map((p) => `        <Route path="${p === "首页" || p === "Home" ? "/" : "/" + p.toLowerCase()}" element={<${p}Page />} />`).join("\n") + `\n      </Routes>\n    </BrowserRouter>\n  </StrictMode>\n);\n`, "utf-8");
}

function scaffoldVueProject(deployDir: string, srcDir: string, brief: DesignBrief, pages: string[]) {
  const pkg = {
    name: brief.project.replace(/\s+/g, "-").toLowerCase(), private: true, version: "0.0.1", type: "module",
    scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
    dependencies: { vue: "^3.5.0", "vue-router": "^4.4.0" },
    devDependencies: { "@vitejs/plugin-vue": "^5.2.0", typescript: "~5.7.0", vite: "^6.0.0", "vue-tsc": "^2.2.0", tailwindcss: "^3.4.0", postcss: "^8.4.0", autoprefixer: "^10.4.0" },
  };
  writeFileSync(resolve(deployDir, "package.json"), JSON.stringify(pkg, null, 2), "utf-8");

  writeFileSync(resolve(deployDir, "vite.config.ts"),
    `import { defineConfig } from "vite";\nimport vue from "@vitejs/plugin-vue";\n\nexport default defineConfig({\n  plugins: [vue()],\n});\n`, "utf-8");

  writeFileSync(resolve(deployDir, "tsconfig.json"), JSON.stringify({
    compilerOptions: { target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "bundler", strict: true, esModuleInterop: true, skipLibCheck: true }, include: ["src/**/*.ts", "src/**/*.vue"],
  }, null, 2), "utf-8");

  writeFileSync(resolve(deployDir, "tailwind.config.js"),
    `export default {\n  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],\n  theme: { extend: { colors: { primary: "${brief.theme.colors[0] || "#3b82f6"}", secondary: "${brief.theme.colors[1] || "#6366f1"}", accent: "${brief.theme.colors[2] || "#f59e0b"}" } } },\n  plugins: [],\n};\n`, "utf-8");

  writeFileSync(resolve(deployDir, "postcss.config.js"), `export default {\n  plugins: { tailwindcss: {}, autoprefixer: {} },\n};\n`, "utf-8");

  writeFileSync(resolve(deployDir, "index.html"),
    `<!doctype html>\n<html lang="zh-CN">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${brief.project}</title>\n  </head>\n  <body>\n    <div id="app"></div>\n    <script type="module" src="/src/main.ts"></script>\n  </body>\n</html>\n`, "utf-8");

  writeFileSync(resolve(srcDir, "env.d.ts"), `/// <reference types="vite/client" />\ndeclare module "*.vue" {\n  import type { DefineComponent } from "vue";\n  const component: DefineComponent<{}, {}, any>;\n  export default component;\n}\n`, "utf-8");

  writeFileSync(resolve(srcDir, "index.css"),
    `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root { font-family: Inter, system-ui, sans-serif; }\nbody { margin: 0; min-height: 100vh; }\n`, "utf-8");

  const validPages = pages.filter((p) => p !== "shared");
  writeFileSync(resolve(srcDir, "router.ts"),
    `import { createRouter, createWebHistory } from "vue-router";\n`
    + validPages.map((p) => `import ${p}Page from "./components/${p}/index.vue";`).join("\n") + `\n\n`
    + `const routes = [\n` + validPages.map((p) => `  { path: "${p === "首页" || p === "Home" ? "/" : "/" + p.toLowerCase()}", component: ${p}Page },`).join("\n") + `\n];\n\n`
    + `export default createRouter({ history: createWebHistory(), routes });\n`, "utf-8");

  writeFileSync(resolve(srcDir, "main.ts"),
    `import { createApp } from "vue";\nimport App from "./App.vue";\nimport router from "./router";\nimport "./index.css";\n\ncreateApp(App).use(router).mount("#app");\n`, "utf-8");

  writeFileSync(resolve(srcDir, "App.vue"),
    `<template>\n  <router-view />\n</template>\n\n<script setup lang="ts">\n</script>\n`, "utf-8");
}

// ========== 静态 HTML 部署 ==========

function deployStaticHTML(projectDir: string, brief: DesignBrief): { url: string; projectPath: string } {
  const staticDir = resolve(projectDir, "deploy-static");
  mkdirSync(staticDir, { recursive: true });

  // 查找 HTML 文件
  const generatedDir = resolve(projectDir, "generated-code");
  const combinedPath = resolve(generatedDir, "all-components.html");

  if (existsSync(combinedPath)) {
    writeFileSync(resolve(staticDir, "index.html"), readFileSync(combinedPath), "utf-8");
  } else {
    // 兜底：聚合所有 HTML 组件
    let html = `<!doctype html>\n<html lang="zh-CN">\n<head><meta charset="UTF-8"><title>${brief.project}</title></head>\n<body>`;
    const compDir = resolve(generatedDir, "src", "components");
    if (existsSync(compDir)) {
      walkDir(compDir, staticDir, ".html", brief);
    }
    html += `</body>\n</html>`;
    writeFileSync(resolve(staticDir, "index.html"), html, "utf-8");
  }

  console.log("[3/4] Vercel 静态部署...");
  const deployUrl = deployToVercel(staticDir, true);

  console.log("\n  --- 静态预览 ---");
  console.log(`  项目路径: ${staticDir}`);
  if (deployUrl) console.log(`  Vercel URL: ${deployUrl}`);
  console.log(`  (静态 HTML 直接可用浏览器打开 index.html) \n`);

  return { url: deployUrl, projectPath: staticDir };
}

function walkDir(dir: string, _dest: string, _ext: string, _brief: DesignBrief): void {
  // Placeholder — actual HTML aggregation handled by L3
}

// ========== 主入口 ==========

export async function deployPreview(briefPath: string): Promise<{ url: string; projectPath: string }> {
  const mode = config.pipeline.mode;
  const framework = config.pipeline.preview.framework;
  const brief: DesignBrief = JSON.parse(readFileSync(briefPath, "utf-8"));
  const projectDir = resolve(config.paths.output, brief.project);

  // === HTML 静态模式 ===
  if (framework === "html") {
    return deployStaticHTML(projectDir, brief);
  }

  // === 开发模式：部署 L3 已生成的前端项目 ===
  if (mode === "development") {
    return deployDevProject(projectDir, brief);
  }

  // === 预览模式：React / Vue ===
  console.log("═══════════════════════════════════════");
  console.log(`  第 4 层：自动部署 (预览模式 · ${framework.toUpperCase()})`);
  console.log("═══════════════════════════════════════\n");

  const deployDir = resolve(projectDir, "deploy-preview");
  const srcDir = resolve(deployDir, "src");
  const componentsDir = resolve(srcDir, "components");

  console.log(`[1/5] 创建 ${framework.toUpperCase()} 项目: ${deployDir}`);
  mkdirSync(deployDir, { recursive: true });
  mkdirSync(srcDir, { recursive: true });
  mkdirSync(componentsDir, { recursive: true });

  // 复制组件
  const generatedCodeDir = resolve(projectDir, "generated-code", "src", "components");
  if (existsSync(generatedCodeDir)) {
    console.log("[2/5] 复制组件代码...");
    copyRecursive(generatedCodeDir, componentsDir);
  }

  const pages = readdirSync(componentsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  // 框架特定脚手架
  if (framework === "vue") {
    scaffoldVueProject(deployDir, srcDir, brief, pages);
  } else {
    scaffoldReactProject(deployDir, srcDir, brief, pages);
  }

  // 安装依赖
  console.log("[3/5] 安装依赖...");
  try {
    execSync("npm install", { cwd: deployDir, stdio: "pipe" });
    console.log("  ✓ 依赖安装完成");
  } catch (err) {
    console.log("  ⚠ 依赖安装失败:", String(err).slice(0, 200));
  }

  // Vercel 部署
  console.log("[4/5] Vercel 部署...");
  const deployUrl = deployToVercel(deployDir);

  console.log("[5/5] 完成\n");
  console.log("  --- 预览信息 ---");
  console.log(`  框架: ${framework.toUpperCase()}`);
  console.log(`  项目路径: ${deployDir}`);
  console.log(`  本地预览: cd "${deployDir}" && npm run dev`);
  if (deployUrl) console.log(`  Vercel URL: ${deployUrl}`);
  console.log("");

  return { url: deployUrl || "", projectPath: deployDir };
}

/** 开发模式：部署 L3 生成的完整前端项目 */
function deployDevProject(projectDir: string, brief: DesignBrief) {
  const devFrontendDir = resolve(projectDir, "dev-project", "frontend");
  const bf = config.pipeline.development.backendFramework;

  console.log("═══════════════════════════════════════");
  console.log(`  第 4 层：开发模式部署`);
  console.log("═══════════════════════════════════════\n");

  if (!existsSync(devFrontendDir)) {
    console.log("  ⚠ 开发项目尚未生成，请先运行 L3\n");
    return { url: "", projectPath: "" };
  }

  // 安装前端依赖
  console.log("[1/3] 安装前端依赖...");
  try {
    execSync("npm install", { cwd: devFrontendDir, stdio: "pipe" });
    console.log("  ✓ 前端依赖安装完成");
  } catch (err) {
    console.log("  ⚠ 前端依赖安装失败:", String(err).slice(0, 200));
  }

  // 安装后端依赖
  const devBackendDir = resolve(projectDir, "dev-project", "backend");
  console.log("[2/3] 安装后端依赖...");
  if (existsSync(devBackendDir)) {
    try {
      execSync("npm install", { cwd: devBackendDir, stdio: "pipe" });
      console.log("  ✓ 后端依赖安装完成");
    } catch (err) {
      console.log("  ⚠ 后端依赖安装失败:", String(err).slice(0, 200));
    }
  }

  // 部署前端预览
  console.log("[3/3] Vercel 部署前端...");
  const deployUrl = deployToVercel(devFrontendDir);

  console.log("\n  --- 开发模式部署完毕 ---");
  console.log(`  前端路径: ${devFrontendDir}`);
  console.log(`  后端路径: ${devBackendDir}`);
  console.log(`  启动前端: cd "${devFrontendDir}" && npm run dev`);
  console.log(`  启动后端: cd "${devBackendDir}" && npm run dev`);
  if (deployUrl) console.log(`  前端预览: ${deployUrl}`);
  console.log("");

  return { url: deployUrl, projectPath: devFrontendDir };
}

// ========== 工具 ==========

function copyRecursive(src: string, dest: string) {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = resolve(src, entry.name);
    const destPath = resolve(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      writeFileSync(destPath, readFileSync(srcPath));
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes("04-deploy")) {
  const briefPath = process.argv[2] || resolve(config.paths.output, "../output/智能运维监控平台/design-brief.json");
  deployPreview(briefPath).catch(console.error);
}
