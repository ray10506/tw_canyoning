---
target: Route detail panel (RouteDetail.vue + NzRouteDetail.vue)
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:D:\\docker\\npm\\side-project\\src\\components\\RouteDetail.vue"
target_fingerprint: "sha256:8d23946589e8fba726dbf70a2177318bd477c92315cb61e9f45c95a2dfe98951"
target_path: "D:\\docker\\npm\\side-project\\src\\components\\RouteDetail.vue"
timestamp: 2026-09-13T08-26-52Z
slug: src-components-routedetail-vue
---
Method: dual-agent (A: a89c8264d16376111 · B: a81162e5b83b1df3f)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | "Loading…" text exists for water/rain, but no timestamp on readings, no tab-switch feedback |
| 2 | Match System / Real World | 3 | V/A/roman grading and Taiwanese terms correct; icons feel generic |
| 3 | User Control and Freedom | 2 | Tab state resets on every route change; no back/undo inside panel |
| 4 | Consistency and Standards | 1 | TW and NZ detail components diverge on the same interaction (mobile layout bug), different tab sets, different hazard treatment |
| 5 | Error Prevention | 2 | Parsing is guarded, but silent-garbage fields have no visible fallback |
| 6 | Recognition Rather Than Recall | 1 | User must hold water-level tone in memory while reading the separate rainfall tab to make one decision |
| 7 | Flexibility and Efficiency | 2 | Desktop resize handle is nice; no shortcuts, no route comparison |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained dark UI, but detector found low-contrast text and undersized (10px) labels throughout |
| 9 | Error Recovery | 2 | "Unavailable" copy exists, no retry/next-step |
| 10 | Help and Documentation | 2 | Grade tooltips are hover/focus-only, invisible to touch until first tap, invisible to screen readers |
| **Total** | | **20/40** | **Acceptable — significant improvement needed** |

## Design Specificity Verdict

**LLM assessment**: Partially authored, partially generic. The grading badges with hover tooltips, Taiwanese place names, and live water/rain readouts show real domain investment. But the IA is a plain settings-style tab bar that actively works against the product's own principle ("judge go/no-go in 30 seconds"): water level and rainfall — the two facts that matter most — sit in two separate, non-adjacent tabs the user must visit and mentally combine. Worse, the NZ side (a reference dataset nobody uses to decide whether to go out tonight) gets a better risk-communication pattern — a persistent header risk chip — than the Taiwan side, which is the entire reason the product exists.

**Deterministic scan**: `detect.mjs` exit code 2, 1 static finding — a literal `border-left-width: 3px` "side-tab accent border" on `NzRouteDetail.vue:775` (verified real, not a false positive; category: slop, "most recognizable AI-UI tell"). The much larger signal came from the live browser overlay, not the static scanner:
- Taiwan route detail: 97 anti-patterns — repeated `ai-color-palette` hits (cyan-neon-on-dark across pills/tags/tabs, one purple/violet neon), `undersized-ui-text` (10 instances of ~10px functional text below the 11px floor, including the `快速資訊` section label itself at 10.4px), `low-contrast` (2.5:1 `#555` on `#12122a` for section labels — well under WCAG AA's 4.5:1; 3.2:1 and 4.1:1 elsewhere), `gpt-thin-border-wide-shadow` on the bottom bar, `cramped-padding` on the map container.
- NZ route detail: 23 anti-patterns — same `ai-color-palette`/neon-cyan-purple family, `tiny-text` (11.52px body), `kicker-above-heading` pattern, `gpt-thin-border-wide-shadow`.
- Checked for the usual false-positive (a CSS variable misread as a literal): none found — every flagged color and border is a literal hex/px value in source, not a `var(...)`.

**Visual overlays**: browser mutation succeeded and the overlay ran; the findings above came from live console output on the actual rendered pages, not static estimation.

## Overall Impression

The panel has genuine domain craft in its data layer (grade tooltips, conditional section rendering, live hydrology hooks) but the surface finish reads as templated AI-UI (neon cyan-on-dark palette, thin-border-wide-shadow cards, sub-11px labels, low-contrast grays) and the IA actively fights the product's core promise. There's also a live, already-shipped regression: Taiwan's mobile "full-screen" detail view doesn't go full-screen. The single biggest opportunity is collapsing the safety-critical signal (water level + rain forecast) into one always-visible status line instead of two buried tabs — that's the whole point of this tool.

## What's Working

1. Grade tooltips (`ROPE_TIPS`/`WATER_TIPS`/`TIME_TIPS`) turn a cryptic "V2 A2 III" string into plain-language explanations in the community's own vocabulary — the sharpest piece of domain-specific design in the panel.
2. NZ's header risk chip (flood severity, jumps straight to the Risk tab) is exactly the "judge in 30 seconds" pattern the product needs — it just isn't on the Taiwan side yet.
3. Field-level conditional rendering (`v-if="d.location_zh || d.location"`, etc.) genuinely implements "hide empty sections," with fallback copy (`尚無時間資料`) instead of a blank pane.

## Priority Issues

**[P0] Taiwan mobile detail panel doesn't go full-screen — contradicts the shipped backlog spec**
- Why it matters: PRODUCT.md's backlog explicitly calls for "手機使用全螢幕詳情" (mobile = full-screen). Verified live via `getBoundingClientRect()` at 638px width: the panel renders `{x:0, width:452}` — a 452px sliver pinned to the left edge, with the route list still visible to its right underneath. `NzRouteDetail.vue`'s equivalent rule correctly resolves to full width (`{x:0, width:638}`) at the identical breakpoint, so this is an isolated regression in `RouteDetail.vue`, not a design ambiguity.
- Fix: the mobile media query's `width` rule is losing to the inline `:style="{ width: panelWidth+'px' }"` used for the desktop resize handle. Add `!important` to the mobile rule, or stop applying the inline `panelWidth` style once the mobile query is active.
- Suggested command: `/impeccable adapt`

**[P0] Safety-critical data (water level + rainfall) is split across two non-adjacent tabs with no synthesized status anywhere**
- Why it matters: directly undercuts the product's own stated principle — judge "go today?" within 30 seconds. A user must open Weather, read the rain number, hold it in memory, switch to Hydrology, read the water level/alert tone, and mentally combine both. Readings also carry no timestamp, which matters for flash-flood-risk data.
- Fix: add one always-visible status strip near the grade row summarizing water-level alert tier + next-24h rain tone, sourced from data already computed in `waterSummary`/`rainfallSummary` — no new data plumbing needed.
- Suggested command: `/impeccable layout`

**[P1] Templated AI-UI surface finish: neon palette, sub-11px text, low-contrast labels**
- Why it matters: 120 combined detector findings (97 TW + 23 NZ) — cyan/purple neon-on-dark across pills and tabs, section labels at 10.4px (below the 11px legibility floor), `#555` text at 2.5:1 contrast on dark background (WCAG AA needs 4.5:1). This is the "could be any product" signature the design-specificity check exists to catch, and the low-contrast instances are a real accessibility failure, not just taste.
- Fix: raise functional text to ≥11px, fix the flagged contrast pairs to ≥4.5:1, replace the neon cyan/purple accent family with something the brand actually owns (current brand color is `#6c8ef5`, not cyan).
- Suggested command: `/impeccable colorize` then `/impeccable typeset`

**[P1] No header-level hazard signal on Taiwan routes**
- Why it matters: `NzRouteDetail.vue` computes `hasRiskSignal` and shows a clickable header chip; `RouteDetail.vue` has the equivalent `d.hazards` field but only surfaces it buried inside the Hydrology tab body. The higher-traffic, higher-stakes dataset gets the weaker treatment.
- Fix: port the NZ risk-chip pattern into `RouteDetail.vue`.
- Suggested command: `/impeccable layout`

**[P2] Tab IA doesn't match the backlog's specified order, and "route features" has no section at all**
- Why it matters: backlog specifies quick info → timing → route features → access/transport → GPX/location → hydrology/weather. Actual order is info → timing → weather → hydrology → approach (GPX/location last, hydrology split from weather); deep-pool/shuttle/elevation tags are jammed into the info tab only when there's no extended data, so data-rich routes never show them.
- Fix: re-sequence tabs to match the spec; give route-feature tags (deep pool, shuttle, elevation) their own always-rendered section instead of an info-tab fallback.
- Suggested command: `/impeccable layout`

## Persona Red Flags

**Riley (stress-tester / night-before decision-maker)**: Needs three tab switches (Weather → Hydrology → back to Info) to answer one question, and each value is lost from view once the user switches away. Neither the water reading nor the rain reading carries a timestamp, despite being flash-flood-relevant data with an explicit staleness risk.

**Sam (accessibility)**: Grade tooltips are CSS-only (`data-tooltip` + `::after`) with no `aria-describedby` or live region — a screen-reader user gets "V2" with zero explanation, while a sighted mouse user gets the full text. The NZ stylesheet's own comment on `--dim: #7878a8` admits "reads 3.1:1 on #1a1a2e — secondary labels only," yet it's applied to normal-size `dt` labels site-wide, below the 4.5:1 floor that size requires. The detector independently found further contrast failures (2.5:1, 3.2:1, 4.1:1) elsewhere in the same panel.

**Casey (mobile)**: Directly hits the P0 layout bug — on a real phone, the Taiwan detail panel renders as a narrow left-pinned sliver over the map instead of going full-screen, almost certainly unusable one-handed.

## Minor Observations

- `grade-compact` span is rendered with `display:none` — dead markup, delete it.
- Elevation-profile SVG has no `<title>`/`aria-label` — acceptable only because the numeric gain/loss is already shown as text beside it.
- NZ's `riskChipLabel` truncates to 8 characters + ellipsis — verify it doesn't cut mid-word on longer real labels.
- Timing tab can render a single line of text in a ~400px-tall pane on data-poor routes — technically "not empty" but functionally indistinguishable from the empty state the backlog asked to avoid.

## Questions to Consider

1. If a user can look at this panel for 5 seconds before deciding not to go, what's the one thing they'd see — and why isn't it the biggest thing on screen today?
2. Why does the NZ reference dataset get better risk communication than the Taiwan dataset that the whole product exists for?
3. Does a 5-tab dashboard model even fit an "info panel" (the backlog's own words), or would one scrollable panel with a fixed risk summary pinned above the fold serve the 30-second decision better?
