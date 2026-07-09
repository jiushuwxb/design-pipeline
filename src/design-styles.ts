import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { config } from "./config.js";

export interface DesignStyleSummary {
  id: string;
  name: string;
  useCases: string[];
  description: string;
  intro?: string;
}

export interface DesignStyleIndex {
  default: string;
  styles: DesignStyleSummary[];
}

export interface DesignStylePreset extends DesignStyleSummary {
  styleMarkdown: string;
  tokens: Record<string, unknown>;
  sections?: DesignSectionModule[];
}

export interface DesignSectionModule {
  id: string;
  name: string;
  purpose: string;
  bestFor: string[];
  structure: string[];
  compositionNotes: string;
}

export function loadDesignStyleIndex(): DesignStyleIndex {
  const indexPath = resolve(config.paths.designStyles, "index.json");
  return JSON.parse(readFileSync(indexPath, "utf-8")) as DesignStyleIndex;
}

export function listDesignStyles(): DesignStyleSummary[] {
  return loadDesignStyleIndex().styles;
}

export function resolveDesignStyleId(id?: string): string {
  const index = loadDesignStyleIndex();
  const requested = id || process.env.DESIGN_STYLE_PRESET || config.pipeline.preview.stylePreset || index.default;
  if (index.styles.some((style) => style.id === requested)) {
    return requested;
  }
  return index.default;
}

export function loadDesignStyle(id?: string): DesignStylePreset {
  const styleId = resolveDesignStyleId(id);
  const index = loadDesignStyleIndex();
  const summary = index.styles.find((style) => style.id === styleId) || index.styles[0];
  const styleDir = resolve(config.paths.designStyles, styleId);
  const stylePath = resolve(styleDir, "style.md");
  const tokensPath = resolve(styleDir, "tokens.json");
  const sectionsPath = resolve(styleDir, "sections.json");

  if (!existsSync(stylePath) || !existsSync(tokensPath)) {
    throw new Error(`Design style preset is incomplete: ${styleId}`);
  }

  return {
    ...summary,
    styleMarkdown: readFileSync(stylePath, "utf-8"),
    tokens: JSON.parse(readFileSync(tokensPath, "utf-8")) as Record<string, unknown>,
    sections: existsSync(sectionsPath)
      ? JSON.parse(readFileSync(sectionsPath, "utf-8")) as DesignSectionModule[]
      : undefined,
  };
}

export function formatDesignStyleForPrompt(style: DesignStylePreset): string {
  return [
    `## Design Style Preset: ${style.name} (${style.id})`,
    ``,
    style.description,
    ``,
    `### Preset Rules`,
    style.styleMarkdown.trim(),
    ``,
    `### Tokens`,
    "```json",
    JSON.stringify(style.tokens, null, 2),
    "```",
    style.sections?.length
      ? [
        ``,
        `### Section Library`,
        `Use these sections as composable page modules. Select only the modules that fit the PRD, then arrange them into a coherent page composition. Theme colors are defaults and may be overridden by PRD/brand colors.`,
        ``,
        ...style.sections.map((section, index) => [
          `${index + 1}. ${section.name} (${section.id})`,
          `   Purpose: ${section.purpose}`,
          `   Best for: ${section.bestFor.join(", ")}`,
          `   Structure: ${section.structure.join(" -> ")}`,
          `   Composition: ${section.compositionNotes}`,
        ].join("\n")),
      ].join("\n")
      : "",
  ].join("\n");
}
