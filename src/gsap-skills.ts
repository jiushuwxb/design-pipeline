import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { projectRoot } from "./config.js";

export type GsapSkillId = "gsap-core" | "gsap-timeline" | "gsap-scrolltrigger" | "gsap-performance";

export interface GsapSkillProfile {
  enabled: boolean;
  framework: string;
  skillIds: GsapSkillId[];
  prompt: string;
  sourceFiles: string[];
}

const skillRoot = resolve(projectRoot, ".agents", "skills");

const selectedSections: Record<GsapSkillId, RegExp[]> = {
  "gsap-core": [/Core Tween Methods/i, /Transforms and CSS properties/i, /Accessibility and responsive/i, /Official GSAP best practices/i, /Do Not/i],
  "gsap-timeline": [/Position Parameter/i, /Timeline Defaults/i, /Official GSAP Best practices/i, /Do Not/i],
  "gsap-scrolltrigger": [/Registering the Plugin/i, /Timeline \+ ScrollTrigger/i, /Refresh and Cleanup/i, /Official GSAP best practices/i, /Do Not/i],
  "gsap-performance": [/Prefer Transform and Opacity/i, /Batch Reads and Writes/i, /Many Elements/i, /ScrollTrigger and Performance/i, /Best practices/i, /Do Not/i],
};

function readSkill(id: GsapSkillId): { path: string; markdown: string } {
  const path = resolve(skillRoot, id, "SKILL.md");
  if (!existsSync(path)) throw new Error(`Required project GSAP skill is missing: ${path}`);
  return { path, markdown: readFileSync(path, "utf-8") };
}

export function extractSkillSections(markdown: string, headings: RegExp[]): string {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];
  let activeLevel = 0;
  for (const line of lines) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line);
    if (match) {
      const level = match[1].length;
      if (activeLevel && level <= activeLevel) activeLevel = 0;
      if (headings.some((heading) => heading.test(match[2]))) {
        activeLevel = level;
        output.push(line);
        continue;
      }
    }
    if (activeLevel) output.push(line);
  }
  return output.join("\n").trim();
}

function frameworkRules(framework: string): string {
  if (framework === "react") {
    return `- Install and use gsap plus @gsap/react. Register useGSAP with gsap.registerPlugin(useGSAP).
- Scope selectors to a root ref and use useGSAP({ scope: root }); use contextSafe for delayed/event callbacks.
- Do not leave animations or ScrollTriggers alive after unmount.`;
  }
  if (framework === "vue") {
    return `- Import gsap from "gsap". Create animations in onMounted with a root-scoped gsap.context().
- Call context.revert() and matchMedia.revert() in onUnmounted. Register ScrollTrigger once when used.`;
  }
  return `- Load https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js and, when selected, https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js before the page animation module.
- Keep the HTML usable when scripts fail and disable or minimize motion for prefers-reduced-motion.`;
}

export function resolveGsapSkillProfile(styleId: string, styleMarkdown: string, framework: string): GsapSkillProfile {
  if (process.env.GSAP_SKILLS_ENABLED === "false") {
    return { enabled: false, framework, skillIds: [], prompt: "", sourceFiles: [] };
  }

  const motionText = `${styleId}\n${styleMarkdown}`.toLowerCase();
  const expressive = /(awwwards|portfolio-motion|dark-3d|sequence|scene|mask|reveal)/.test(motionText);
  const scrollDriven = /(scroll|parallax|pinned|pinning|scrub)/.test(motionText);
  const skillIds: GsapSkillId[] = ["gsap-core"];
  if (expressive) skillIds.push("gsap-timeline");
  if (scrollDriven) skillIds.push("gsap-scrolltrigger");
  skillIds.push("gsap-performance");

  const loaded = skillIds.map(readSkill);
  const directives = loaded.map(({ path, markdown }, index) => {
    const id = skillIds[index];
    return `### Project skill: ${id}\nSource: ${path}\n${extractSkillSections(markdown, selectedSections[id])}`;
  }).join("\n\n");

  return {
    enabled: true,
    framework,
    skillIds,
    sourceFiles: loaded.map((skill) => skill.path),
    prompt: `## Mandatory GSAP implementation contract
The following directives were loaded from this repository's installed GSAP skills. Apply them to purposeful motion in the restored page; do not invent motion that conflicts with the design.

Framework lifecycle rules:
${frameworkRules(framework)}

- Prefer GSAP for coordinated entrance, timeline, and scroll-driven motion; keep trivial hover/focus feedback in CSS.
- Use gsap.matchMedia() and provide a prefers-reduced-motion branch.
- Animate transforms/autoAlpha instead of layout properties. No production markers.
- Every animation, context, matchMedia instance, and ScrollTrigger must be cleaned up.

${directives}`,
  };
}

export function writeGsapSkillManifest(projectDir: string, profile: GsapSkillProfile): void {
  writeFileSync(resolve(projectDir, "gsap-skills.json"), JSON.stringify({
    enabled: profile.enabled,
    framework: profile.framework,
    skills: profile.skillIds,
    sources: profile.sourceFiles,
    generatedAt: new Date().toISOString(),
  }, null, 2), "utf-8");
}
