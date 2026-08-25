# Design Pipeline

Terminal-first AI pipeline that turns a PRD into a structured design brief, optional Stitch handoff, generated preview or development code, a verified local build, and an AI review loop.

## Quick start

```bash
npm install
copy .env.example .env
npm run doctor
npm run interactive -- ./templates/sample-prd.md
```

Non-interactive examples:

```bash
npm run pipeline -- ./templates/sample-prd.md --mode preview --framework react --style premium-bento-saas
npm run pipeline -- ./templates/sample-prd.md --mode development --framework react --backend express
npm run pipeline -- ./templates/sample-prd.md --mode preview --framework react --require-stitch
```

Deployment is opt-in. Add `--deploy` only when a Vercel preview should be created after review passes.

## Pipeline contract

1. L1 validates model JSON as a `DesignBrief`; invalid output is retried with validation errors.
2. L2 creates Stitch prompts and `stitch-handoff.json`. It does **not** claim that Stitch ran.
3. If Stitch is used externally, save validated results to `output/<project>/stitch-prompts/stitch-results.json`. L3 consumes them automatically. `--require-stitch` makes this mandatory.
4. L3 generates code. On review failure, the complete improvement guide is passed into every next-round component prompt.
5. L4 installs dependencies and runs the generated project's build. Results are saved to `build-verification.json`.
6. L5 reviews the brief, code, build result, and optional browser evidence. A failed or skipped build cannot pass review.

## GSAP restoration skills

L3 dynamically loads the repository-installed GSAP instructions from `.agents/skills/`:

- `gsap-core` and `gsap-performance` for every restored page;
- `gsap-timeline` for expressive, scene-based, or sequenced presets;
- `gsap-scrolltrigger` when the preset specifies scroll, parallax, pinning, or scrub behavior.

React output includes `gsap` and `@gsap/react`; Vue output includes `gsap`; standalone HTML uses the pinned GSAP 3.15 jsDelivr build. L5 rejects implementations that ignore the selected skills, omit lifecycle cleanup, omit reduced-motion handling, or fail to implement a required ScrollTrigger path. Set `GSAP_SKILLS_ENABLED=false` only when motion generation must be explicitly disabled.

## Browser evidence

L4 writes `output/<project>/visual-evidence/request.json`. A browser-capable agent or test runner can use it to capture every route at desktop and mobile sizes. Save screenshots in that directory and add:

```json
{
  "status": "passed",
  "capturedAt": "2026-08-23T00:00:00.000Z",
  "screenshots": [
    { "route": "/", "viewport": "desktop", "path": "home-desktop.png" }
  ],
  "findings": []
}
```

Without a validated `visual-evidence/review.json`, L5 explicitly reports a code/brief-only review and does not claim visual verification.

## Quality checks

```bash
npm run check
```

Environment variables and provider configuration are documented in `.env.example`. A generated static example is available at `output/racing-hypercar-official/index.html`.
