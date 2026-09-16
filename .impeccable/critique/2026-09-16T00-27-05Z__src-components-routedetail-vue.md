---
target: Route Detail panel (RouteDetail.vue)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:D:\\docker\\npm\\side-project\\src\\components\\RouteDetail.vue"
target_fingerprint: "sha256:f1f85ac2308be05d4d1849997df69000b5843024ae761e540eae56e4306861d7"
target_path: "D:\\docker\\npm\\side-project\\src\\components\\RouteDetail.vue"
timestamp: 2026-09-16T00-27-05Z
slug: src-components-routedetail-vue
closed: true
---
Method: dual-agent (A: acc653bbc9b994f06 · B: aaeeacdc57a6fc827)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Hydrology loading/unavailable states exist, but no panel skeleton and no retry affordance on fetch failure |
| 2 | Match System / Real World | 4/4 | Native TW canyoneering vocabulary (V/A/羅馬數字, 集水區, AB車) used throughout, not genericized |
| 3 | User Control and Freedom | 3/4 | Close/tabs/waypoint toggle are reversible; grade-badge tooltip has no reliable dismiss/re-trigger on touch |
| 4 | Consistency and Standards | 2/4 | Detector confirms 34 hardcoded design-token deviations (18 colors, 15 font-sizes, 1 radius) in this file alone |
| 5 | Error Prevention | 2/4 | `downloadGpx()` parses `route.gpx_track` with no try/catch, unlike the identical (guarded) parse for `elevationData` |
| 6 | Recognition Rather Than Recall | 3/4 | Grade-code tooltips exist but are hover/focus-only — invisible to touch users who need them most |
| 7 | Flexibility and Efficiency | 3/4 | Desktop-only resizable panel (380–900px) is a real power-user affordance |
| 8 | Aesthetic and Minimalist Design | 2/4 | Quick Info is one undifferentiated 9+ block scroll; detector independently confirms 3 low-contrast label/value pairs and 2 undersized-text instances in this exact scroll |
| 9 | Error Recovery | 1/4 | No retry UI anywhere; DESIGN.md explicitly requires "source + problem + retry" on API failure — this component only ever shows silent "unavailable" text |
| 10 | Help and Documentation | 3/4 | Inline tooltips + external source links (KiwiCanyons, CWA) serve as contextual help |
| **Total** | | **26/40** | **Acceptable (65%)** |

## Design Specificity Verdict

**LLM assessment**: This is authored specifically for Taiwan canyoneering, not a generic detail panel — evidence includes native V/A/Roman-numeral grade parsing with per-code tooltips, a 集水區 (catchment) link-out, AB-shuttle/deep-pool tags, a CWA town-ID lookup table for deep-linking the correct official forecast, and a hand-rolled GPX exporter. No generic-SaaS "details/settings/actions" scaffolding. This clears the specificity bar well.

**Deterministic scan**: `detect.mjs` found 34 advisory findings in this file, all design-token drift: 18 hardcoded colors, 15 off-ramp font-sizes, 1 non-scale border-radius (full list below). None are error/critical severity — this is systemic token drift, not a structural defect.

**Visual overlays** (browser injection succeeded): Assessment B injected the live detector into the actual running panel (茄苳瀑布 route) and confirmed, with a screenshot, real user-facing consequences of that drift: `div.section-label` text at 10.4px with 2.5:1 contrast on `#12122a` (needs 11px / 4.5:1), `div.info-key` at 4.1:1, `div.info-sub` at 3.2:1 (×3), and an eyebrow label at 10.88px. It also flagged the panel's cyan/purple pill accents as reading like a generic "AI dark dashboard" palette rather than a Taiwan-canyoneering-specific one — worth weighing against the LLM's specificity verdict above, since the chrome (badges/pills) is the part that looks most templated even though the content is not. One detector rule (`clipped-overflow-container` on the panel root, and `gpt-thin-border-wide-shadow` on the unrelated floating toolbar) is a likely false positive — see below.

## Overall Impression

The panel is genuinely built for this product's real workflow — the grade tooltips, catchment link, and CWA deep-link are not decoration, they're the actual value proposition. What's holding it back from "good" is that the token system DESIGN.md defines isn't being used here: 34 one-off hex/font values have quietly eroded the label/value/sub-text hierarchy into a wash of near-identical grays, several of which now measurably fail contrast in the live page. Combine that with two real gaps at the exact moment this product is supposed to shine — hazards text hidden behind a non-default tab, and a GPX download that can fail silently — and the biggest opportunity here isn't a redesign, it's finishing the token migration DESIGN.md already calls out as tracked debt, plus closing two specific safety/reliability gaps.

## What's Working

1. **The status strip refuses to lie about missing data.** Its own logic renders an honest "no coverage nearby" message instead of defaulting to a green/neutral state — a textbook implementation of DESIGN.md's "Status Is Data" rule, in a component built by a different pass than the one that wrote the docs.
2. **Grade tags translate codes into plain language inline** (ROPE_TIPS/WATER_TIPS/TIME_TIPS), directly serving users who know the grading system but want quick confirmation, without sending them off-app.
3. **Conditional rendering is disciplined.** Tag rows, elevation section, catchment link, GPX row, and notes are each individually gated on real data presence — routes with less data actually look leaner, not emptier, matching DESIGN.md's "hide, don't show empty" mandate.

## Priority Issues

**[P0] Hazards text can go completely unseen.** `d.hazards`/`d.hazards_zh` only render inside the Hydrology tab, which is not the default tab, and the status strip gives no cue that hazard text exists when there's no nearby water/rain station. A user can read difficulty + weather on the default Info tab, feel reassured, and close the panel having never seen a documented hazard — on the exact "should I go" decision this product exists to inform.
**Why it matters**: this is the one class of information whose absence has real physical consequences, not just UX friction.
**Fix**: surface a hazards flag/snippet on the Info tab or in the always-visible header, independent of whether a hydrology station is nearby.
**Suggested command**: `/impeccable harden`

**[P1] GPX download can fail silently.** `downloadGpx()` parses `route.gpx_track` with no try/catch (the identical parse for `elevationData` elsewhere in the same file is guarded). Malformed data throws to console only; the button appears to do nothing.
**Why it matters**: this is the action users take specifically to prep the night before a trip — a silent failure means they discover it's missing gear data in the field, not at home.
**Fix**: wrap in try/catch, show an inline "GPX data invalid" message instead of failing silently.
**Suggested command**: `/impeccable harden`

**[P1] Grade-code legends are unreachable on touch, and fail contrast where they do render.** Tooltips live in `::after { content: attr(data-tooltip) }` on hover/focus of a `<span tabindex="0">` with no `aria-label`/`aria-describedby` — mobile taps don't reliably trigger `:focus`, and screen readers get "V2" with no explanation. Independently, the detector confirms the surrounding label text (`div.section-label`, `div.info-key`, `div.info-sub`) fails WCAG contrast at 2.5:1–4.1:1 against the panel background.
**Why it matters**: this product's primary use case is a mobile check the night before or morning of a trip — the exact platform where the legend is invisible.
**Fix**: make grade tags tap-to-expand (reuse the pattern already built for waypoints) and add `aria-label`; raise the gray label tiers to meet 4.5:1 against `#12122a`.
**Suggested command**: `/impeccable adapt`

**[P1] No retry affordance when hydrology/weather data fails to load.** `waterSummary`/`rainfallSummary` only ever produce quiet "unavailable" text, contradicting DESIGN.md's explicit requirement to show source + problem + retry on API failure — for a product whose #1 stated principle is "水文優先" (hydrology first) and whose own docs note WRA/CWA APIs are frequently flaky.
**Why it matters**: a silent failure on the data this product is *for* looks identical to "no data exists," which a user could misread as normal/safe conditions.
**Fix**: add a retry button plus source/problem text per DESIGN.md's existing spec, matching the pattern already used elsewhere for API failures.
**Suggested command**: `/impeccable clarify`

**[P2] 34 hardcoded design-token deviations, some with real light-theme consequences.** Detector-confirmed: 18 colors, 15 font-sizes, 1 radius outside DESIGN.md's scale (full list below). `.info-tag.ele { color: #a78bfa }` introduces an undocumented 6th accent color that risks being misread as new semantic status; `.kind-badge.route { background: #3a2800 }` and the many dark-only literal grays have no `html[data-theme='light']` override anywhere in this file, meaning this component likely breaks contrast when a user switches themes — this is a functional bug riding on top of tech debt, not styling debt alone.
**Why it matters**: DESIGN.md already flags this file as the worst offender for token drift; every new hardcoded value makes the eventual migration larger and, in the meantime, actively degrades the label hierarchy the type scale is designed to produce.
**Fix**: migrate to `--color-*`/type-scale tokens per DESIGN.md's own tracked-debt section, starting with the label-tier grays the detector flagged as failing contrast.
**Suggested command**: `/impeccable polish`

## Persona Red Flags

**Jordan (First-Timer)**: Nothing visually marks the V/A/Roman badges or ★ rating as interactive/explainable — no underline, no info icon, no "tap for details" affordance — so a first-timer has no reason to discover the tooltip exists at all, defeating the purpose of the plain-language legend text that was written for exactly this persona.

**Sam (Accessibility-Dependent)**: Tooltip content on grade tags, stars, and the status-strip legend is CSS-only (`::after { content: attr(...) }`), never exposed via `aria-label`/`aria-describedby` — a screen reader announces "V2" with zero explanation. Confirmed independently by the detector: `div.section-label` (2.5:1), `div.info-key` (4.1:1), `div.info-sub` (3.2:1) all fail WCAG AA contrast on the live page. The close button's correct `aria-label` usage elsewhere in the same file makes this omission look like an inconsistency, not a deliberate choice.

**Casey (Distracted Mobile User)**: No `env(safe-area-inset-bottom)` padding anywhere in the file despite DESIGN.md explicitly requiring the mobile sheet not be covered by the browser safe area. Combined with the single long Quick Info scroll (location → character → grade → gear → tags → region → max-drop → catchment → source → GPX → elevation, all before hazards on a separate tab), assembling the full "should I go" picture on a phone requires more taps and scrolling than the product's own 30-second-decision goal allows. Note: live mobile-viewport behavior could not be directly verified this run (see below) — this finding is from static code review, not an observed live failure.

## Minor Observations

- `.grade-compact` is rendered but `display:none` — dead markup that should be removed.
- Close button uses a literal "✕" glyph while the rest of the file uses SVG icons (waypoint chevron, coordinate icon) — a small consistency gap.
- Waypoint names truncate with `text-overflow: ellipsis` and no `title` fallback — a long name is unrecoverable without leaving the panel.
- Detector flagged `div.bottom-bar` (thin border + wide shadow) and `div.panel`'s clipped-overflow container — both assessed as likely false positives: the bottom-bar is a separate floating toolbar outside this file's scope, and a slide-in panel with internal scroll normally needs overflow clipping on its root.
- The cyan/purple pill palette on grade tags reads to a fresh eye as generic "dark dashboard" styling rather than TW-canyoneering-specific — flagged by the detector as `ai-color-palette`; worth a deliberate look even though it's plausibly intentional design-system color for water/technical grades.

### Detector findings (full list, `src/components/RouteDetail.vue`)
Colors (18): L1295 `#3a2800`, L1345 `#ccc`, L1435 `#666`, L1483 `#999`, L1590 `#1a2e1a`, L1595 `#a78bfa`, L1612 `#666`, L1623 `#e63946`, L1640 `#555`, L1680 `#999`, L1729 `#555`, L1763 `#3a5fc0`, L1773 `#555`, L1786 `#777`, L1792 `#ccc`, L1798 `#666`, L1886 `#ccc`, L1899 `#555`, L1933 `#555`
Font-sizes (15): L1303 `1rem`, L1436 `0.65rem`, L1476 `0.82rem`, L1480 `0.7rem`, L1553 `0.7rem`, L1639 `0.7rem`, L1663 `0.68rem`, L1770 `0.65rem`, L1784 `0.7rem`, L1868 `11px`, L1884 `13px`, L1892 `11px`, L1932 `0.82rem`
Radius (1): L1286 `10px`

## Questions to Consider

- What if hazards and the hydrology status strip merged into one always-visible "conditions" card shown identically on every tab, so safety-relevant text can never be tab-hidden from a scanning user?
- What if grade badges used the same tap-to-expand interaction already proven in this file for waypoints, instead of a hover-only tooltip nobody on mobile can reach?
- What if Quick Info split into two labeled groups ("Route" vs. "Logistics"), so the first glance surfaces grade and hazard-adjacent info before gear/GPX/source, instead of one undifferentiated 9-block list?
