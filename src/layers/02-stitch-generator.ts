/**
 * Layer 2: generate Stitch-ready design prompts.
 *
 * This layer does not call Stitch directly. In Codex/Claude Code, the agent
 * can read these prompts and use the registered Stitch MCP/skill to create
 * actual design drafts.
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { config } from "../config.js";
import { formatDesignStyleForPrompt, loadDesignStyle } from "../design-styles.js";
import { DesignBrief, type DesignOutput } from "../types.js";

function buildStitchPrompt(
  page: DesignBrief["pages"][0],
  brief: DesignBrief,
  designStyle: string,
  designSystem?: string
): string {
  const components = page.components
    .map((component) => {
      const states = component.states.length > 0
        ? ` states: ${component.states.join(", ")}`
        : "";
      const interactions = component.interactions.length > 0
        ? ` interactions: ${component.interactions.join("; ")}`
        : "";
      return `- ${component.name} [${component.type}]: ${component.description}${states}${interactions}`;
    })
    .join("\n");

  const designSystemBlock = designSystem
    ? `\n## Design System Constraints\n${designSystem}\n`
    : "";

  const uiUxSkillBlock = process.env.UI_UX_PRO_MAX_AVAILABLE === "true"
    ? `
## UI/UX Pro Max Enhancement
Before sending this prompt to Stitch, use the ui-ux-pro-max skill to enhance:
- information hierarchy
- layout rhythm
- visual style direction
- responsive behavior
- accessibility notes
- component state coverage
Keep the final output faithful to this PRD and do not replace production constraints.
`
    : "";

  return `Create a high-fidelity UI design draft for this page.

## Project
- Name: ${brief.project}
- Style: ${brief.theme.style}
- Atmosphere: ${brief.theme.atmosphere}
- Colors: ${brief.theme.colors.join(", ") || "choose a suitable palette from the style"}

## Page
- Name: ${page.name}
- Route: ${page.route}
- Layout: ${page.layout}
- Description: ${page.description}

## Components
${components}
${designSystemBlock}
${designStyle}
${uiUxSkillBlock}
## Design Requirements
1. First create a page composition plan: choose and order the most relevant modules from the Section Library.
2. Treat tokens as defaults, not fixed brand colors. PRD/brand colors override token colors when provided.
3. Design complete page sections, not isolated cards. Each section should have a clear purpose in the page story.
4. Match the selected style's layout rules, component recipes, motion rules, and negative rules.
5. Show important component states: loading, empty, error, success where relevant.
6. Give interactive elements clear visual affordance.
7. Design for a 1440px desktop viewport and keep responsive behavior in mind.
8. Keep spacing, typography, color, and component treatment consistent across the page.
9. This is preview-mode design work; optimize for visual clarity and presentation quality.
`;
}

export async function generateStitchPrompts(briefPath: string): Promise<DesignOutput[]> {
  console.log("\n[L2] Stitch prompt generation");

  const brief = DesignBrief.parse(JSON.parse(readFileSync(briefPath, "utf-8")));
  console.log(`Read design brief: ${brief.pages.length} page(s)`);

  let designSystem: string | undefined;
  try {
    designSystem = readFileSync(resolve(briefPath, "../../.stitch/DESIGN.md"), "utf-8");
    console.log("Detected .stitch/DESIGN.md and injected design-system constraints.");
  } catch {
    console.log("No .stitch/DESIGN.md detected. Using PRD-derived constraints only.");
  }

  if (process.env.UI_UX_PRO_MAX_AVAILABLE === "true") {
    console.log("ui-ux-pro-max enhancement is enabled for preview prompts.");
  }

  const style = loadDesignStyle(config.pipeline.preview.stylePreset);
  const designStylePrompt = formatDesignStyleForPrompt(style);
  console.log(`Using design style preset: ${style.name} (${style.id})`);

  const outDir = resolve(config.paths.output, brief.project, "stitch-prompts");
  mkdirSync(outDir, { recursive: true });

  const outputs: DesignOutput[] = [];

  for (const page of brief.pages) {
    const prompt = buildStitchPrompt(page, brief, designStylePrompt, designSystem);
    const safeFileName = page.name.replace(/[^a-zA-Z0-9一-龥]/g, "_");
    const promptPath = resolve(outDir, `${safeFileName}.prompt.md`);

    writeFileSync(promptPath, prompt, "utf-8");
    outputs.push({
      pageName: page.name,
      prompt,
      status: "pending",
    });

    console.log(`Generated ${promptPath}`);
  }

  const summaryPath = resolve(outDir, "_all_prompts.json");
  writeFileSync(summaryPath, JSON.stringify(outputs, null, 2), "utf-8");

  const handoffPath = resolve(outDir, "stitch-handoff.json");
  writeFileSync(handoffPath, JSON.stringify({
    status: "awaiting-external-design",
    generatedAt: new Date().toISOString(),
    instructions: "Run each prompt through Stitch, then save results as stitch-results.json in this directory.",
    resultSchema: {
      pageName: "string",
      stitchUrl: "optional string",
      screenshot: "optional path or URL",
      prompt: "original prompt",
      status: "generated | failed | pending",
      error: "optional string",
    },
    prompts: outputs.map((output) => ({ pageName: output.pageName, status: output.status })),
  }, null, 2), "utf-8");

  console.log(`Prompt summary saved: ${summaryPath}`);
  console.log(`Stitch handoff saved: ${handoffPath}`);
  console.log("No Stitch design has been claimed as generated. Add stitch-results.json after the external Stitch step; L3 will consume it automatically.");

  return outputs;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes("02-stitch")) {
  const briefPath = process.argv[2] || resolve(config.paths.output, "sample/design-brief.json");
  generateStitchPrompts(briefPath).catch(console.error);
}
