# Audit — Read-Only Diagnostic

`audit` reports what's wrong with a page. **It never edits code.** Output a findings list the user can act on (or hand to `redesign` / `bolder` / `quieter` / `soul`).

> If the user wants the fixes applied, that's `redesign` (or a specific refine command), not `audit`. Keep this one read-only — that boundary is the whole point.

---

## Flow

1. **Identify the target & register.** Which file(s)/URL? Is it brand or product (§0.A)? The register decides which checks are load-bearing (a dashboard isn't failing for low SPECTACLE).
2. **Run the three scans below**, in order. Note failures — do not fix.
3. **Score & prioritize.** Group findings P0 (ships broken) → P1 (clearly cheap) → P2 (polish). Lead with the single highest-leverage fix.
4. **Report.** One-line verdict, then the prioritized list. Each finding: what, where (`file:line` when possible), why it's a tell, and which command fixes it.

---

## Scan 1 — Cheapness Blacklist (`anti-cheap.md`)

**First run the detector** (no network, pure local file scan) to get machine-verifiable hits, then add your own eye:

```bash
node skills/finesse-ui/scripts/detect.mjs --json <target ...>
```

It reports findings grouped P0/P1/P2 with `file:line` and the fixing command in `files[]`, a `p0` count, and a `notCovered[]` list of the tells the regex layer **cannot** see. It **always exits 0** — findings are data in the JSON, not a tool failure; read `p0` to know the count (a non-zero exit is reserved for the `--strict` CI/git-hook mode). If the script can't be found (the skill was dropped into a project without it), don't treat that as a blocker — scan by hand against `anti-cheap.md` below. **A clean run means "no regex-detectable slop", not "this page is good"** — the `notCovered[]` items are exactly why Scan 1 always continues into the by-eye pass. Fold its hits into your report, then load `references/anti-cheap.md` and check the offenders the regex can't see (taste-level: default-category aesthetic, fake screenshots, generic card grids):

- [ ] em-dashes / `--` used as a flourish in copy
- [ ] gradient text (`background-clip:text` + gradient)
- [ ] default/decorative glassmorphism
- [ ] side-stripe card borders (`border-left/right` > 1px as accent)
- [ ] eyebrow on every section (count > ceil(sections / 3))
- [ ] `01 · / 02 · / 03 ·` numbered scaffolding as default
- [ ] identical card grids (icon + title + text × N)
- [ ] div-based fake screenshots / fake dashboards
- [ ] fake-precise numbers (`92%`, `4.1×`) with no source
- [ ] default-category palette (beige+brass for craft, purple-glow for AI/SaaS)
- [ ] `Inter` / `Fraunces` / `Instrument Serif` reached for with no stated reason
- [ ] pure `#fff` / `#000`; untinted neutrals; hard `#333` borders
- [ ] missing grain layer on a surface that should read as premium
- [ ] accent color drifts across sections (color-lock broken)
- [ ] zero imagery on an image-implied brief (food / hotel / fashion / travel)

## Scan 2 — Spectacle Shown (§1.B, finesse-specific)

The check impeccable doesn't have. **This is finesse's signature audit.**

- [ ] What SPECTACLE does the page claim (stated, or inferred from the soul/brief)?
- [ ] If SPECTACLE ≥ 7: does the markup actually contain a working engine? Search for `three`, `canvas`, `gsap` / `ScrollTrigger`, `webgl`, `requestAnimationFrame`. **If claimed ≥7 but none present → P0 "spectacle claimed, not shown" — the page is broken, not just plain.**
- [ ] Does the engine degrade gracefully (readable with it removed)?
- [ ] `prefers-reduced-motion`: is there a still-frame / static fallback? Missing → P0.
- [ ] Motion motivated? Every ScrollTrigger / marquee / pin needs a one-sentence reason. > 1 marquee → flag.

> When the browser-verification step (P2-B, `preflight.md`) is available, don't just grep — open the page and confirm the engine renders real pixels (not white / not flat background). A page that greps clean but ships a white hero still fails this scan.

## Scan 3 — Pre-Flight Gates (`preflight.md`)

Load `references/preflight.md` and run the hard gates: substrate present, a11y (contrast ≥4.5:1 body, visible focus, 44px touch targets), responsive (no headline overflow at any breakpoint, `min-h-dvh`), performance (transform/opacity only, lazy-loaded engines). Any hard-rule failure is P0.

---

## Output shape

```
Audit: {target} · register={brand|product} · verdict={1 line}

P0 — ships broken
  • {finding} ({file:line}) — {why} → fix with `{command}`
P1 — clearly cheap
  • …
P2 — polish
  • …

Highest-leverage next step: `/finesse {command} {target}`
```

Keep it scannable. No fixes, no rewritten code — point at the command that does the fix.
