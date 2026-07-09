# Design Pipeline Agent Instructions

This repository is a terminal-first AI design pipeline for Codex / Claude Code.

The intended user experience is natural language:

> Read this PRD and run the design pipeline.

The agent should translate that request into deterministic local commands and only use AI/skills where the workflow calls for creative generation, review, or repair.

## Core Workflow

1. Read the PRD and run the pipeline.
2. Ask the user to choose `preview` or `development`.
3. In `preview` mode, run design prompting first.
4. In `preview` mode, ask for a design style preset and implementation target: `html`, `vue`, or `react`.
5. Create a local preview and run review. Review should cover both visual quality and code quality when browser/verification skills are available.
6. If review passes, ask whether the user wants a Vercel preview deployment.

## Commands

```bash
npm run doctor
npm run interactive -- <prd-path>
npm run pipeline -- <prd-path> --mode preview --framework react
npm run pipeline -- <prd-path> --mode preview --framework react --style premium-bento-saas
npm run pipeline -- <prd-path> --mode development --framework react --backend express
npm run pipeline -- <prd-path> --mode preview --framework react --deploy
```

Prefer `npm run interactive -- <prd-path>` for natural-language operation because it asks for mode/framework and prompts for Vercel deployment after review passes.

## Preview Mode

Preview mode is for websites, landing pages, marketing displays, dashboards, and visually polished demos.

Behavior:

- Generate `design-brief.json` from the PRD.
- Select a design style preset from `design-styles/`.
- Generate Stitch prompts under `output/<project>/stitch-prompts/`.
- Use Stitch MCP/skill to create design drafts when available.
- Generate `html`, `vue`, or `react` implementation code based on the user's choice.
- Build a local preview project.
- Run review before Vercel deployment.

### ui-ux-pro-max Skill

`ui-ux-pro-max` is bundled in this project at `.agents/skills/ui-ux-pro-max` and is preview-only.

Use it to enhance design prompts before executing Stitch design work. Do not use it in development mode unless the user explicitly asks for visual-only inspiration.

If the bundled skill is unexpectedly unavailable, continue with the built-in prompt generation. Missing `ui-ux-pro-max` must not block the pipeline.

### Design Style Presets

Preview mode includes reusable design style presets under `design-styles/`.

Available presets:

- `premium-bento-saas`
- `framer-saas-minimal`
- `linear-product-clean`
- `webflow-portfolio-motion`
- `awwwards-motion-brand`
- `dark-3d-tech`
- `editorial-studio`
- `enterprise-dashboard`

The selected preset must be injected into both Stitch prompt generation and preview code generation. Use `--style <preset>` for non-interactive runs.

Each preset includes:

- `style.md`: style rules, component recipes, motion rules, and negative constraints
- `tokens.json`: default visual tokens, not fixed brand colors
- `sections.json`: composable page modules for arranging complete pages

For preview websites, prioritize section composition over fixed theme colors. Choose 5-8 suitable sections from `sections.json`, arrange them into a coherent page story, and let PRD/brand colors override preset token colors when present.

Do not copy third-party websites. These presets are abstracted style rules, tokens, layout recipes, motion rules, and negative constraints inspired by mature web design categories.

## Development Mode

Development mode is for production module code that should follow company project conventions.

Behavior:

- Generate `design-brief.json` from the PRD.
- Skip Stitch design prompt generation by default.
- Read and follow `development-code-template/`.
- Generate frontend and backend module code according to the selected stack.
- Prefer production maintainability over visual flourish.

Development mode must not let external UI prompt skills override company templates, API conventions, file structure, or coding standards.

## Environment

Required:

- Node.js 18+
- npm 9+
- `.env` with AI provider credentials

Common `.env` keys:

```env
ANTHROPIC_API_KEY=your-api-key
ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
ANTHROPIC_MODEL=DeepSeek-V4-pro[1m]
STITCH_API_KEY=your-stitch-api-key
STITCH_MCP_URL=https://stitch.googleapis.com/mcp
VERCEL_TOKEN=your-vercel-token
VERCEL_SCOPE=your-team-or-user-scope
```

In networks that cannot reach Google/Vercel directly, configure proxy environment variables for Codex / Claude Code:

```env
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
```

## Stitch MCP

Register Stitch MCP before preview design work:

```bash
Codex mcp add stitch \
  --transport http https://stitch.googleapis.com/mcp \
  --header "X-Goog-Api-Key: your-stitch-api-key" \
  -s user
```

Verify:

```bash
Codex mcp list
```

## Deployment Rule

Do not deploy to Vercel automatically unless:

- the user confirms after review passes, or
- the command includes `--deploy`, or
- `DEPLOY_TO_VERCEL=true` is explicitly set.

The pipeline uses Vercel preview deployment by default, not production deployment.

## Troubleshooting

| Problem | Cause | Action |
|---|---|---|
| `fetch failed` for Stitch | Proxy or MCP not configured | Run `npm run doctor`, then check `Codex mcp list` and proxy env vars |
| AI JSON parse failure | Model returned malformed/truncated JSON | Re-run the failed layer or reduce PRD size |
| Code generation partially fails | AI timeout or invalid component output | Continue, then use review/build output to repair |
| Preview build fails | Generated code or dependencies invalid | Read build errors and repair generated files |
| Vercel deployment fails | Token/scope/network issue | Check `VERCEL_TOKEN`, `VERCEL_SCOPE`, and retry |
