/**
 * Main workflow orchestrator.
 *
 * Flow:
 * 1. Parse PRD into design-brief.json.
 * 2. In preview mode, generate Stitch prompts for design.
 * 3. Generate code.
 * 4. Create a local preview project without deploying by default.
 * 5. Run AI design/code review.
 * 6. If review passes, optionally deploy a Vercel preview.
 */

import { createInterface } from "readline";
import { resolve } from "path";
import { mkdirSync, writeFileSync } from "fs";
import { config } from "./config.js";
import type { PipelineState } from "./types.js";

async function runLayer1(prdPath: string) {
  const { parsePRD } = await import("./layers/01-prd-parser.js");
  return parsePRD(prdPath);
}

async function runLayer2(briefPath: string) {
  const { generateStitchPrompts } = await import("./layers/02-stitch-generator.js");
  return generateStitchPrompts(briefPath);
}

async function runLayer3(briefPath: string) {
  const { designToCode } = await import("./layers/03-design-to-code.js");
  return designToCode(briefPath);
}

async function runLayer4(briefPath: string) {
  const { deployPreview } = await import("./layers/04-deploy-preview.js");
  return deployPreview(briefPath);
}

async function runLayer5(briefPath: string) {
  const { reviewDesign } = await import("./layers/05-design-review.js");
  return reviewDesign(briefPath);
}

async function main() {
  const prdPath = process.argv[2];

  if (!prdPath) {
    console.log(`
Usage:
  npm run pipeline -- <prd-path> [options]

Options:
  --mode <mode>       preview | development
  --framework <fw>    preview framework: react | vue | html
  --style <preset>    preview design style preset
  --backend <fw>      development backend: express | fastify | koa
  --deploy            deploy to Vercel after the review passes

Examples:
  npm run pipeline -- ./templates/sample-prd.md --mode preview --framework react
  npm run pipeline -- ./templates/sample-prd.md --mode development --backend express
`);
    process.exit(0);
  }

  applyCliArgs();

  const prdAbsPath = resolve(prdPath);
  const pipelineId = `run-${Date.now()}`;
  const modeLabel = config.pipeline.mode === "development"
    ? `development / ${config.pipeline.development.frontendFramework}+${config.pipeline.development.backendFramework}`
    : `preview / ${config.pipeline.preview.framework} / ${config.pipeline.preview.stylePreset}`;

  console.log(`\nDesign Pipeline ${pipelineId}`);
  console.log(`Mode: ${modeLabel}`);
  console.log(`PRD: ${prdAbsPath}\n`);

  const state: PipelineState = {
    id: pipelineId,
    prdPath: prdAbsPath,
    currentLayer: 0,
    mode: config.pipeline.mode,
    previewFramework: config.pipeline.preview.framework,
    backendFramework: config.pipeline.development.backendFramework,
    codeStandards: config.codeStandards,
    designs: [],
    codeOutputs: [],
    backendOutputs: [],
    iteration: 0,
    maxIterations: config.pipeline.maxIterations,
  };

  state.currentLayer = 1;
  const brief = await runLayer1(prdAbsPath);
  state.designBrief = brief;
  const briefPath = resolve(config.paths.output, brief.project, "design-brief.json");
  saveState(state);

  if (config.pipeline.mode === "preview") {
    state.currentLayer = 2;
    console.log("\n[L2] Preview mode: generating Stitch design prompts.");
    console.log("Codex/Claude should use the bundled ui-ux-pro-max skill before Stitch prompt execution.");
    const designs = await runLayer2(briefPath);
    state.designs = designs;
    saveState(state);
  } else {
    console.log("\n[L2] Development mode: skipping Stitch prompt generation.");
    console.log("Development mode should rely on development-code-template and project coding standards.");
  }

  state.currentLayer = 3;
  const codeOutputs = await runLayer3(briefPath);
  state.codeOutputs = codeOutputs;
  saveState(state);

  state.currentLayer = 4;
  const previousDeployFlag = process.env.DEPLOY_TO_VERCEL;
  process.env.DEPLOY_TO_VERCEL = "false";
  config.deploy.enabled = false;
  await runLayer4(briefPath);
  process.env.DEPLOY_TO_VERCEL = previousDeployFlag;
  config.deploy.enabled = previousDeployFlag === "true";
  saveState(state);

  state.currentLayer = 5;
  let reviewResult = await runLayer5(briefPath);
  state.reviewReport = reviewResult;
  saveState(state);

  while (reviewResult.needIteration && state.iteration < state.maxIterations) {
    state.iteration++;
    console.log(`\n[Iteration ${state.iteration}/${state.maxIterations}] Generating improvement guide and rerunning code/review.`);

    const iterationGuide = generateIterationGuide(reviewResult);
    const iterPath = resolve(config.paths.output, brief.project, `iteration-${state.iteration}.md`);
    writeFileSync(iterPath, iterationGuide, "utf-8");
    console.log(`Iteration guide saved: ${iterPath}`);

    state.currentLayer = 3;
    state.codeOutputs = await runLayer3(briefPath);

    state.currentLayer = 4;
    config.deploy.enabled = false;
    await runLayer4(briefPath);

    state.currentLayer = 5;
    reviewResult = await runLayer5(briefPath);
    state.reviewReport = reviewResult;
    saveState(state);
  }

  if (!reviewResult.needIteration) {
    const shouldDeploy = await shouldDeployToVercel();
    if (shouldDeploy) {
      console.log("\n[Vercel] Review passed. Deploying preview...");
      process.env.DEPLOY_TO_VERCEL = "true";
      config.deploy.enabled = true;
      await runLayer4(briefPath);
    }
  }

  printFinalReport(state, codeOutputs.length);
}

function applyCliArgs() {
  const cliMode = parseArg("--mode");
  const cliFramework = parseArg("--framework");
  const cliStyle = parseArg("--style");
  const cliBackend = parseArg("--backend");

  if (cliMode) {
    process.env.PIPELINE_MODE = cliMode;
    config.pipeline.mode = cliMode as any;
  }
  if (cliFramework) {
    process.env.PREVIEW_FRAMEWORK = cliFramework;
    config.pipeline.preview.framework = cliFramework as any;
    config.pipeline.development.frontendFramework = cliFramework as any;
  }
  if (cliStyle) {
    process.env.DESIGN_STYLE_PRESET = cliStyle;
    config.pipeline.preview.stylePreset = cliStyle;
  }
  if (cliBackend) {
    process.env.DEV_BACKEND_FRAMEWORK = cliBackend;
    config.pipeline.development.backendFramework = cliBackend as any;
  }
  if (process.argv.includes("--deploy")) {
    process.env.DEPLOY_TO_VERCEL = "true";
    config.deploy.enabled = true;
  }
}

async function shouldDeployToVercel(): Promise<boolean> {
  if (process.argv.includes("--deploy") || process.env.DEPLOY_TO_VERCEL === "true") {
    return true;
  }
  if (process.env.ASK_DEPLOY !== "true" || !process.stdin.isTTY) {
    console.log("\n[Vercel] Review passed. Skipping deployment. Re-run with --deploy to publish a preview.");
    return false;
  }

  const answer = await ask("\nReview passed. Deploy a Vercel preview now? [y/N] ");
  return answer.trim().toLowerCase() === "y";
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolveAnswer) => {
    rl.question(question, (answer) => {
      rl.close();
      resolveAnswer(answer);
    });
  });
}

function saveState(state: PipelineState) {
  const statePath = resolve(
    config.paths.output,
    state.designBrief?.project || "unknown",
    "pipeline-state.json"
  );
  mkdirSync(resolve(statePath, ".."), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2), "utf-8");
}

function generateIterationGuide(report: any): string {
  const criticalIssues = report.issues.filter(
    (i: any) => i.severity === "critical" || i.severity === "major"
  );
  const minorIssues = report.issues.filter(
    (i: any) => i.severity === "minor" || i.severity === "suggestion"
  );

  return `# Iteration Improvement Guide

Review score: ${report.overallScore}/100

## Must fix
${criticalIssues.map((i: any) => `- [${i.category}] ${i.description}\n  Suggestion: ${i.suggestion}`).join("\n")}

## Suggested improvements
${minorIssues.map((i: any) => `- [${i.category}] ${i.description}\n  Suggestion: ${i.suggestion}`).join("\n")}
`;
}

function printFinalReport(state: PipelineState, firstPassCodeCount: number) {
  const project = state.designBrief?.project || "unknown";
  const review = state.reviewReport;
  console.log("\nPipeline complete");
  console.log(`Project: ${project}`);
  console.log(`Mode: ${state.mode}`);
  console.log(`Generated code files: ${firstPassCodeCount}`);
  console.log(`Iterations: ${state.iteration}`);
  if (review) {
    console.log(`Final review: ${review.overallScore}/100 (${review.needIteration ? "needs iteration" : "passed"})`);
  }
  console.log(`Output: ${resolve(config.paths.output, project)}`);
}

function parseArg(name: string): string | null {
  const idx = process.argv.indexOf(name);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return null;
}

main().catch((err) => {
  console.error("\nPipeline failed:", err);
  process.exit(1);
});
