# Asset Sourcing — Where the Imagery Actually Comes From

`anti-cheap.md` bans zero imagery on an image-implied brief (food, hotel, fashion, travel, product…) but doesn't say where the pictures come from. Most briefs arrive with **no real assets attached**. This file is the decision protocol for getting real imagery into the page without silently fabricating it, silently spending the user's generation budget, or silently pulling from the network.

> The core rule, regardless of path: **name what you're about to fetch or generate, then wait for a go-ahead, before you do it.** Never ship a page where the images appeared with no accountable source. Path B (downloading/hotlinking free stock resources) gets this treatment **especially** — it's pulling from the open network into the user's project, so it is a stop-and-confirm step, not an FYI-then-proceed. This mirrors the harness-level rule that external fetches / uploads / spend get flagged, not auto-run.

---

## 1. Check What's Actually Available First

Before picking a path, look at what the current session can do — this skill runs across different harnesses (Claude Code, Codex, Cursor, Copilot) and their capabilities differ:

1. **Does the user already have real assets?** Ask once, early, if the brief implies specific real subjects (an actual restaurant's dishes, an actual product line, an actual team's headshots) — generic stock cannot substitute for a *specific real thing*. If they have a folder/CMS/DAM, use that before reaching for anything below.
2. **Is an image-generation tool available in this session?** (a native image-gen tool, an MCP image tool, etc.) → **Path A**.
3. **No generation, but network fetch is available** (WebFetch, a browser tool, curl) → **Path B**.
4. **Neither** → **Path C**, the generative-placeholder fallback — and say so explicitly.

Don't guess capability — check the actual tool list for this session before committing to a path.

---

## 2. Path A — Generate

Generation costs real time/compute and produces something that must not be mistaken for a real photograph of a real place/product/person if it isn't one.

- **Propose the shot list before generating.** One line per image: subject, framing (close-up / wide / detail), lighting mood, aspect ratio. Tie the lighting/color language to the page's **locked accent** (`design-dna.md`'s color-lock) so every generated image reads as one shoot, not five stock photos from different photographers.
- **Get a go-ahead on the list, not on each image.** One batch confirmation covers the whole page ("I'll generate 4 images: hero product shot, 2 detail crops, 1 lifestyle/context shot — all warm-lit, shallow depth of field, matching the amber accent. Proceed?"). Re-confirm only if the count or subject changes significantly mid-build.
- **Alt text stays honest.** Describe what's depicted; don't caption a generated image as if it were a specific real photographer's work or a specific real location unless the brief actually says so.
- **Never generate identifiable real people** (a real named founder, a real customer) — generate anonymous/stylized subjects, or ask for a real photo instead.

## 3. Path B — Real Stock Photography (hotlink, don't scrape)

This skill's own shipped examples already do this: `nova-brutal-typographic.html` and `offscreen-editorial.html` hotlink specific, deliberately-picked photos directly from `images.unsplash.com/photo-{id}?w=&h=&fit=crop&q=`. That's the pattern — reuse it, don't reinvent it.

- **Use the direct CDN, not a randomizer.** `images.unsplash.com/photo-{specific-id}` (or Pexels' equivalent direct image CDN) is a real, stable asset URL you deliberately picked. A "random image" redirect endpoint is not — it changes on every load/cache-bust and has been deprecated/rate-limited before. Never wire a page to an endpoint that returns a *different* image tomorrow than it does today.
- **Pick specific photos, don't blind-hotlink a search.** Search by the mood/subject the brief implies, open/verify a handful of specific candidates, and pick the ones that match the persona's color grade and composition needs (crop-ability for the layout, room for text overlay, correct orientation).
- **Stop and get explicit authorization before wiring any of them in — one batch ask, not per-image nagging.** State the source (Unsplash/Pexels) and the specific picks in one line, then **wait for the user's go-ahead** before the URLs are wired into the page — e.g. "Using 3 real Unsplash photos for the hero + 2 gallery slots (moody, low-key food photography to match the persona) — proceed?" Downloading/hotlinking free stock resources is pulling from the open network into the user's project; treat it like any other external fetch that needs a yes first, not a courtesy heads-up you plow ahead of.
- **License discipline.** Unsplash License and Pexels License both permit free commercial use without attribution — but that's specific to those two; don't assume every "free image site" carries the same terms. Check the specific source's license before use; when in doubt, prefer Unsplash/Pexels over an unfamiliar site.
- **Don't imply endorsement.** A stock photo of a person is not that person endorsing the (often fictional) brand — fine for mood/lifestyle imagery, not fine as a fake "customer testimonial" headshot presented as real.
- **Real alt text**, matching what's actually depicted (see `commerce-ui.md` §1 for the PDP-specific version of this rule).
- **If hotlinking turns out to be slow or unreliable once actually wired in** — a request hangs, takes far longer than a normal image fetch (tens of seconds instead of near-instant), or times out during your own verification pass — **stop and ask the user** whether to keep the hotlinked URLs as-is or download those same specific picks into the project locally instead. This is a build-blocking judgment call, not yours to make silently either direction: don't quietly switch to local download without saying so, and don't quietly leave slow/broken hotlinks in place and call the page done. State what you observed in one line ("the hotlinked Unsplash images are taking 50+ seconds to load in this environment — download the same 6 picks into `images/` locally instead, or leave them hotlinked?") and wait for the answer, the same way the initial source/pick authorization above requires a go-ahead.

## 4. Path C — No Generation, No Network: Generative Placeholder

When neither A nor B is available, **say so explicitly** — don't silently ship a gradient blob and call it done (that's the exact "hero = text + gradient blob" tell `anti-cheap.md` already bans). Instead:

- Reach for a **generative CSS/Canvas texture as a stand-in**, per the documented techniques in `style-personas.md` / `inspiration-catalog.md` (halftone/riso simulation, duotone gradient over a generative pattern, particle/fluid fields tied to the hero engine). These read as intentional design, not as a missing-image apology.
- **Flag it as a substitute, not a solution.** One line to the user: "No image source available in this session — using a generative [technique] in place of real photography for now; swap in real imagery before shipping to production." Never let this fallback quietly become the permanent state of an image-implied brief.

---

## 5. Universal Rules (all three paths)

- **Style-lock across the page.** Whichever path, every image on one page shares one color grade / lighting language / crop logic — mixing a warm generated hero with a cool stock gallery reads as cheap, same failure mode as breaking the accent lock in `design-dna.md`.
- **Never fabricate provenance.** Don't caption/attribute an image in a way that misrepresents where it came from (generated vs. real; stock vs. brand-owned).
- **Performance still applies.** Responsive images, `srcset`/`sizes`, WebP/AVIF, lazy-load below the fold — this is unchanged by source (`preflight.md` §7).
- **One confirmation ask per page, not per image.** The goal is accountability, not friction — ask once, in one line covering the whole page's image needs, and wait for the answer before fetching/generating any of it.

## 6. Quick Decision Table

| Session has | Path | Gate before acting |
|---|---|---|
| Image-gen tool | A — generate | shot list (count + one-line prompt each) — **wait for go-ahead** |
| Network fetch, no image-gen | B — real stock, hotlinked by specific ID | source + picks, one line — **wait for go-ahead** (downloading into the user's project is an external-fetch action, treat it as one) |
| Neither | C — generative CSS/Canvas placeholder | explicit "this is a stand-in" disclosure |
| User has real assets for a specific real subject | Use those, skip A/B/C | n/a — always preferred over stock/generated when the brief needs a *specific* real thing |
| Path B hotlinks prove slow/unreliable mid-build | Stay on B or fall back to local download | **ask the user which** — don't silently pick either |
