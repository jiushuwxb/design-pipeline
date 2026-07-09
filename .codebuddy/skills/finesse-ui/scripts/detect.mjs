#!/usr/bin/env node
// finesse — local slop / spectacle detector.
// No network, no deps. Scans HTML/CSS/JS files for cheapness tells and the
// finesse-specific "spectacle claimed but not shown" failure.
//
// Usage:
//   node detect.mjs [--json] [--strict] <file ...>
//   node detect.mjs --json skills/finesse-ui/examples/*.html
//
// Exit code: 0 by default — ALWAYS, even when P0 findings exist. Findings are
// DATA carried in the report (the JSON `p0` count), not a tool failure. A
// non-zero exit reads to an agent as "this tool is broken" and it abandons the
// tool entirely, falling back to eyeballing — so the default path never does
// that. Pass --strict to make a P0 finding block with exit 1 (for CI / git
// hooks / humans who want a hard gate). The `audit` command (references/audit.md)
// consumes the --json output and decides for itself; it does not need exit codes.

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const strict = args.includes('--strict');
const files = args.filter((a) => a !== '--json' && a !== '--strict');

// What the regex layer canNOT see. A clean run means "no regex-detectable slop",
// NOT "this page is good" — these taste/structure/runtime tells need a human eye
// (or the Playwright runtime pass in preflight.md §C). Surfaced in every report so
// a green result never reads as license to skip the visual audit.
const NOT_COVERED = [
  'default-category aesthetic (the vibe, not just token names — beige+brass craft, AI purple-glow)',
  'div-based fake screenshots / fake dashboards',
  'identical / generic card grids (icon + title + text × N)',
  'zero imagery on an image-implied brief (food / hotel / fashion / travel)',
  'glassmorphism / AI-purple-glow used as decoration',
  'layout-family repetition (§5) and whether the soul is actually distinct',
  'whether the engine RENDERS real pixels (needs the Playwright runtime pass, not a grep)',
];

if (files.length === 0) {
  // Guidance, not an error. Never teach the agent to abandon the tool.
  const note = 'usage: node detect.mjs [--json] [--strict] <file ...>';
  if (asJson) console.log(JSON.stringify({ p0: 0, files: [], notCovered: NOT_COVERED, note }, null, 2));
  else console.log(note);
  process.exit(0);
}

// ---- helpers ---------------------------------------------------------------

// Find 1-based line number of a regex match index.
function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') line++;
  return line;
}

// Collect every match of a global regex as {line, text}.
function matches(text, re) {
  const out = [];
  let m;
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = r.exec(text)) !== null) {
    out.push({ line: lineOf(text, m.index), text: m[0].slice(0, 80).replace(/\s+/g, ' ').trim() });
    if (m.index === r.lastIndex) r.lastIndex++; // zero-width guard
  }
  return out;
}

// Remove comment bodies (HTML, CSS-block, JS-line) so copy-rules don't fire on
// notes/labels inside comments. Replace with same-length whitespace to keep line
// numbers stable.
function stripComments(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + m.slice(p1.length).replace(/./g, ' '));
}

// ---- generic slop rules ----------------------------------------------------
// Each rule: {id, severity, label, fix, find(text) -> [{line,text}]}

const RULES = [
  {
    id: 'gradient-text',
    severity: 'P1',
    label: 'Gradient text (background-clip:text + gradient)',
    fix: 'typeset / soul',
    find: (t) => {
      // a block that has background-clip:text near a linear/radial-gradient
      const out = [];
      const re = /-?webkit-background-clip\s*:\s*text|background-clip\s*:\s*text/gi;
      let m;
      while ((m = re.exec(t)) !== null) {
        const window = t.slice(Math.max(0, m.index - 240), m.index + 240);
        if (/(linear|radial|conic)-gradient/i.test(window)) {
          out.push({ line: lineOf(t, m.index), text: m[0] });
        }
      }
      return out;
    },
  },
  {
    id: 'side-stripe',
    severity: 'P1',
    label: 'Side-stripe border (border-left/right > 1px as colored accent)',
    fix: 'redesign',
    find: (t) =>
      matches(t, /border-(left|right)\s*:\s*(?:[2-9]|\d{2,})px[^;]*/gi).filter(
        (h) => !/transparent/i.test(h.text)
      ),
  },
  {
    id: 'em-dash',
    severity: 'P2',
    label: 'Em-dash / "--" as a prose flourish (kinetic pause / dramatic aside)',
    fix: 'clarify',
    // Only flag the real tell: an em-dash between two lowercase prose words
    // ("workflow — seamlessly"). Skip structured labels where it's a legitimate
    // separator: number—label ("001 — ENGINE"), CAPS—CAPS ("NEXT — ISSUE 08"),
    // role—name bylines, and CJK labels. Also catch literal " -- " in prose.
    // Scan comment-stripped copy so notes/CSS don't fire.
    find: (t) => matches(stripComments(t), /[a-z]{2,}\s*—\s*[a-z]{2,}|[a-z]{2,}\s--\s[a-z]{2,}/g),
  },
  {
    id: 'numbered-scaffold',
    severity: 'P2',
    label: 'Numbered section scaffolding (01 · / 02 · / 03 ·)',
    fix: 'redesign',
    find: (t) => matches(t, /\b0[1-9]\s*[·.\-/]\s*[A-Z][a-z]/g),
  },
  {
    id: 'default-palette-token',
    severity: 'P2',
    label: 'Default-category palette token name (--cream/--sand/--paper…)',
    fix: 'soul',
    find: (t) =>
      matches(t, /--(cream|sand|paper|parchment|bone|flour|linen|wheat|biscuit|ivory)\b/gi),
  },
  {
    id: 'pure-bw',
    severity: 'P2',
    label: 'Pure #fff / #000 (untinted neutral)',
    fix: 'soul',
    find: (t) => matches(t, /#fff(?:fff)?\b|#000(?:000)?\b/gi),
  },
  {
    id: 'hard-333-border',
    severity: 'P2',
    label: 'Hard #333-ish border instead of translucent',
    fix: 'soul',
    find: (t) => matches(t, /border[^;{]*:\s*[^;]*#(?:333|444|222|ccc|ddd)\b[^;]*/gi),
  },
  {
    id: 'fake-precise-number',
    severity: 'P2',
    label: 'Fake-precise metric (e.g. 4.1×, 92.7%) — verify it has a source',
    fix: 'clarify',
    find: (t) => matches(t, />\s*\d{1,3}\.\d+\s*(?:×|x|%)\s*</g),
  },
];

// ---- finesse-specific: spectacle claimed vs shown --------------------------
// Look for a stated SPECTACLE value (in comments / Design Read / data-attr).
function spectacleCheck(text) {
  const claim = text.match(/SPECTACLE\s*[=:]\s*(\d{1,2})/i);
  if (!claim) return null;
  const value = parseInt(claim[1], 10);
  const line = lineOf(text, claim.index);
  // Evidence of a real engine.
  const enginePatterns = [
    /\bthree(?:\.min)?\.js\b|\bTHREE\b|from\s+['"]three['"]/,
    /\bgetContext\(\s*['"](?:webgl2?|2d)['"]/,
    /\bgsap\b|ScrollTrigger/,
    /requestAnimationFrame/,
    /\bnew\s+OffscreenCanvas\b/,
    /animation-timeline\s*:/i,
  ];
  const hasEngine = enginePatterns.some((re) => re.test(text));
  if (value >= 7 && !hasEngine) {
    return {
      id: 'spectacle-not-shown',
      severity: 'P0',
      label: `SPECTACLE ${value} claimed but no engine found (three/canvas/gsap/rAF/CSS-timeline)`,
      fix: 'animate / bolder',
      hits: [{ line, text: `claimed SPECTACLE=${value}` }],
    };
  }
  return null;
}

// Reduced-motion fallback presence. Only continuous/scroll-driven motion gates a
// P0 — rAF loops, gsap/ScrollTrigger, or @keyframes (which often run infinitely).
// A bare hover `transition:` or one-shot `animation:` does NOT require the media
// query, so it must not trigger a false P0.
function reducedMotionCheck(text) {
  const hasContinuousMotion =
    /requestAnimationFrame|gsap|ScrollTrigger|@keyframes|animation-timeline\s*:/.test(text);
  const hasFallback = /prefers-reduced-motion/.test(text);
  if (hasContinuousMotion && !hasFallback) {
    return {
      id: 'no-reduced-motion',
      severity: 'P0',
      label: 'Continuous motion (rAF/gsap/@keyframes) but no prefers-reduced-motion fallback',
      fix: 'animate',
      hits: [{ line: 0, text: 'no @media (prefers-reduced-motion)' }],
    };
  }
  return null;
}

// Eyebrow density: count tiny-uppercase-tracked labels vs sections.
function eyebrowCheck(text) {
  const eyebrows = (text.match(/letter-spacing\s*:\s*0?\.[12]\d*em/gi) || []).length;
  const uppercases = (text.match(/text-transform\s*:\s*uppercase/gi) || []).length;
  const sections = (text.match(/<section\b/gi) || []).length || 1;
  const eyebrowish = Math.min(eyebrows, uppercases);
  if (eyebrowish > Math.ceil(sections / 3) && eyebrowish >= 3) {
    return {
      id: 'eyebrow-overuse',
      severity: 'P1',
      label: `Likely eyebrow on most sections (~${eyebrowish} vs ${sections} sections)`,
      fix: 'typeset',
      hits: [{ line: 0, text: `${eyebrowish} uppercase+tracked labels` }],
    };
  }
  return null;
}

// ---- run -------------------------------------------------------------------

const report = [];
let p0Count = 0;

for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (e) {
    report.push({ file, error: String(e.message || e), findings: [] });
    continue;
  }

  const findings = [];
  for (const rule of RULES) {
    const hits = rule.find(text);
    if (hits.length) {
      findings.push({ id: rule.id, severity: rule.severity, label: rule.label, fix: rule.fix, count: hits.length, hits: hits.slice(0, 8) });
    }
  }
  for (const fn of [spectacleCheck, reducedMotionCheck, eyebrowCheck]) {
    const f = fn(text);
    if (f) findings.push({ ...f, count: f.hits.length });
  }

  findings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  p0Count += findings.filter((f) => f.severity === 'P0').length;
  report.push({ file, findings });
}

function severityRank(s) {
  return { P0: 0, P1: 1, P2: 2 }[s] ?? 3;
}

// ---- output ----------------------------------------------------------------

if (asJson) {
  console.log(JSON.stringify({ p0: p0Count, files: report, notCovered: NOT_COVERED }, null, 2));
} else {
  for (const { file, findings, error } of report) {
    const name = basename(file);
    if (error) {
      console.log(`\n✗ ${name} — read error: ${error}`);
      continue;
    }
    if (!findings.length) {
      console.log(`\n✓ ${name} — no regex-detectable slop (visual audit still required)`);
      continue;
    }
    console.log(`\n● ${name} — ${findings.length} finding(s)`);
    for (const f of findings) {
      const where = f.hits.map((h) => (h.line ? `L${h.line}` : '')).filter(Boolean).join(', ');
      console.log(`  [${f.severity}] ${f.label}${f.count > 1 ? ` ×${f.count}` : ''}${where ? `  (${where})` : ''}`);
      console.log(`        → fix with \`${f.fix}\``);
    }
  }
  console.log(`\n${p0Count ? `✗ ${p0Count} P0 finding(s) — ships broken` : '✓ no P0 findings'}`);
  console.log(`\nRegex layer only — still needs a human/Playwright pass for:`);
  for (const c of NOT_COVERED) console.log(`  · ${c}`);
}

// See the exit-code note at the top: default is always 0 so the agent never reads
// a finding as a tool malfunction. Only --strict turns a P0 into a blocking exit.
process.exit(strict && p0Count ? 1 : 0);
