import { existsSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";
import { config, projectRoot } from "./config.js";
import { listDesignStyles, loadDesignStyle } from "./design-styles.js";

function ok(label: string, detail = "") {
  console.log(`OK   ${label}${detail ? ` - ${detail}` : ""}`);
}

function warn(label: string, detail = "") {
  console.log(`WARN ${label}${detail ? ` - ${detail}` : ""}`);
}

function fail(label: string, detail = "") {
  console.log(`FAIL ${label}${detail ? ` - ${detail}` : ""}`);
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

function main() {
  console.log("Design Pipeline doctor\n");

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor >= 18) {
    ok("Node.js", process.version);
  } else {
    fail("Node.js", `requires 18+, current ${process.version}`);
  }

  if (existsSync(resolve(projectRoot, "node_modules"))) {
    ok("Dependencies", "node_modules present");
  } else {
    warn("Dependencies", "run npm install");
  }

  if (config.anthropic.apiKey) {
    ok("AI API key", "ANTHROPIC_API_KEY configured");
  } else {
    fail("AI API key", "ANTHROPIC_API_KEY missing");
  }

  if (config.stitch.apiKey) {
    ok("Stitch API key", "STITCH_API_KEY configured");
  } else {
    warn("Stitch API key", "needed for preview design generation through Stitch MCP");
  }

  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    ok("Proxy", process.env.HTTPS_PROXY || process.env.HTTP_PROXY);
  } else {
    warn("Proxy", "not configured; required in networks that cannot reach Google/Vercel directly");
  }

  if (config.deploy.token) {
    ok("Vercel token", "VERCEL_TOKEN configured");
  } else {
    warn("Vercel token", "only needed when deploying preview to Vercel");
  }

  if (isUiUxProMaxInstalled()) {
    ok("ui-ux-pro-max skill", "available for preview-mode prompt enhancement");
  } else {
    warn("ui-ux-pro-max skill", "project-bundled skill not found at .agents/skills/ui-ux-pro-max");
  }

  try {
    const styles = listDesignStyles();
    const sectionCount = styles.reduce((total, style) => {
      return total + (loadDesignStyle(style.id).sections?.length || 0);
    }, 0);
    ok("Design style presets", `${styles.length} preset(s), ${sectionCount} section module(s), default ${config.pipeline.preview.stylePreset}`);
  } catch (err) {
    fail("Design style presets", String(err).slice(0, 200));
  }
}

main();
