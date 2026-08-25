import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { callAIJson, extractJSON } from "../src/api.js";
import { DesignBrief, ReviewReport } from "../src/types.js";
import { templateExists } from "../src/template-engine.js";
import { resolveGsapSkillProfile } from "../src/gsap-skills.js";

test("extractJSON accepts fenced model output", () => {
  assert.deepEqual(extractJSON("result:\n```json\n{\"ok\":true}\n```"), { ok: true });
});

test("callAIJson retries JSON extraction failures", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({
      content: [{ type: "text", text: calls === 1 ? "not json" : "{\"ok\":true}" }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const value = await callAIJson({
      system: "test",
      prompt: "return json",
      schema: z.object({ ok: z.boolean() }),
      schemaName: "TestShape",
    });
    assert.deepEqual(value, { ok: true });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("DesignBrief parsing fills schema defaults", () => {
  const brief = DesignBrief.parse({
    project: "demo",
    theme: { style: "clean" },
    pages: [{ name: "Home", route: "/", description: "Landing", components: [] }],
  });
  assert.deepEqual(brief.theme.colors, []);
  assert.equal(brief.theme.atmosphere, "professional");
  assert.equal(brief.pages[0].layout, "single-column");
});

test("ReviewReport rejects invalid model enums", () => {
  const result = ReviewReport.safeParse({
    overallScore: 90,
    summary: "ok",
    issues: [{ severity: "blocker", category: "usability", description: "x", suggestion: "y" }],
    needIteration: false,
  });
  assert.equal(result.success, false);
});

test("template engine resolves templates from the repository root", () => {
  assert.equal(templateExists("frontend", "react", "component.tsx.tpl"), true);
});

test("GSAP skill routing loads project skills by motion complexity", () => {
  const basic = resolveGsapSkillProfile("premium-bento-saas", "Motion should be restrained.", "react");
  assert.deepEqual(basic.skillIds, ["gsap-core", "gsap-performance"]);
  assert.match(basic.prompt, /\.agents[\\/]skills[\\/]gsap-core[\\/]SKILL\.md/);
  assert.match(basic.prompt, /prefers-reduced-motion/);

  const expressive = resolveGsapSkillProfile("awwwards-motion-brand", "Use scene reveals, parallax and scroll rhythm.", "react");
  assert.deepEqual(expressive.skillIds, ["gsap-core", "gsap-timeline", "gsap-scrolltrigger", "gsap-performance"]);
  assert.match(expressive.prompt, /gsap\.registerPlugin\(ScrollTrigger\)/);
});
