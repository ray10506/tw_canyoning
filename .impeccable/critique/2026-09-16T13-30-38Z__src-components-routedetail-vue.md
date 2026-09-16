---
target: Route Detail panel (RouteDetail.vue)
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:D:\\docker\\npm\\side-project\\src\\components\\RouteDetail.vue"
target_fingerprint: "sha256:b154314b8399248f0ddb7b64ebed4f1c19a742cadbfbcee5cf94c70327a9e886"
target_path: "D:\\docker\\npm\\side-project\\src\\components\\RouteDetail.vue"
timestamp: 2026-09-16T13-30-38Z
slug: src-components-routedetail-vue
---
Method: dual-agent (A: aa3ea5be00e692b18 · B: ad68e639de8e8a016)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Loading/failed/empty hydrology states are distinct and labeled; GPX download gives no success feedback |
| 2 | Match System / Real World | 4/4 | Grade tips, hazard framing, unit-literal values all match documented Taiwan canyoneering vernacular |
| 3 | User Control and Freedom | 3/4 | No undo for a mistapped hazard-banner tab-jump; otherwise close/resize/tabs all reversible |
| 4 | Consistency and Standards | 2/4 | Grade tags are tooltip+aria-labeled in the header but plain (no tabindex/aria) when duplicated in the Quick Info tab; 4 hardcoded colors remain outside the token migration |
| 5 | Error Prevention | 3/4 | GPX parse is now guarded (real fix), but `gpxError` is never reset on route switch |
| 6 | Recognition Rather Than Recall | 3/4 | Status strip + hazard strip surface key facts up front without requiring tab-hunting |
| 7 | Flexibility and Efficiency | 3/4 | Status/hazard strips both shortcut into the Hydrology tab |
| 8 | Aesthetic and Minimalist Design | 3/4 | Dense but progressively disclosed; no empty sections shown |
| 9 | Error Recovery | 3/4 | Hydrology failures name the source and offer Retry per DESIGN.md; GPX error message is actionable |
| 10 | Help and Documentation | 2/4 | No grade-system explainer for a shared link reaching a non-expert; acceptable per target-audience assumption but still a gap for the "可分享" brand commitment |
| **Total** | | **29/40** | **Good (73%)** |

## Design Specificity Verdict

**LLM assessment:** Confirmed authored for Taiwan canyoneering, not reskinned Bootstrap — V/A/Roman grade tags with real per-grade tooltip copy, a hand-built CWA township lookup table to deep-link the correct forecast page, a 集水區觀察員 (catchment observer) external tool link, and vernacular copy throughout (溪降/垂降/水域/AB車接駁). The generic parts (tab shell, card rows) are appropriate — DESIGN.md itself specifies plain, non-decorative "control console" chrome, so that's not genericness, it's the brief.

**Deterministic scan:** Color and radius drift is now fully clean — 0 findings, down from 18 colors + 1 radius. The 12 remaining findings are all font-size advisories; Assessment B verified against DESIGN.md's own text (quoted directly: "Caption 範圍 `0.68–0.72rem` 供判斷用，不強制特定值") that the 0.7/0.68/0.72rem instances are legitimate false-positives-by-design, not drift. Three values (`0.82rem` ×2, `11px` ×2, `13px` ×1) fall outside that specific Caption-band carve-out and aren't otherwise justified in DESIGN.md — worth a second look, not urgent.

**Visual overlays (live browser, screenshot-confirmed):** Re-injecting the detector on the same live panel confirms the previously-flagged `.section-label` and `.info-key` contrast/undersized-text findings are **gone**. Two things persist or newly surfaced: `.info-sub` still trips `tiny-text` at 11.52px, and `.eyebrow` (the "新北 三峽" line) trips `undersized-ui-text` at 10.88px — both below the detector's ~11px floor even though they're within DESIGN.md's informal Caption range, so this is a real (if minor) tension between the project's documented tolerance and actual legibility at small sizes. `clipped-overflow-container` on the panel root is a likely false positive (a slide-in panel with internal scroll needs overflow clipping).

## Overall Impression

This is a real, verified improvement over the last pass — 26 → 29/40, the P0 hazard-visibility gap stays fixed, the color/radius token migration is complete and confirmed live in both themes, and the touch-tooltip fix is confirmed working with real affordance (cursor + underline) before interaction. What's left is smaller-grade residue from the fix passes themselves: a stale-state bug in the GPX error flag, four colors the migration missed, an inconsistent second rendering of grade tags without their accessibility treatment, and a hydrology retry button that's scoped more broadly than its label implies. None of these are new regressions in the sense of breaking something that worked — they're loose threads the fix passes didn't quite pull all the way through.

## What's Working

1. The hazard-banner fix is real, not cosmetic: it renders from the always-visible header, duplicates the full text in the Hydrology tab, checks both `hazards_zh` and `hazards`, and the surrounding code comment shows it was written against the actual failure mode, not just to silence the critique.
2. `waterSummary`/`rainfallSummary` do genuine data-driven judgment — naming alert thresholds instead of showing raw numbers, and explicitly returning "未設定警戒水位" rather than ever defaulting to "normal" when a threshold is simply unset. This is DESIGN.md's anti-pattern rule implemented correctly, not just documented.
3. `parseNote()` sanitizes URLs through `isSafeHttpUrl()` before rendering them as clickable links — an unprompted security-consciousness detail most "just render the field" implementations skip.

## Priority Issues

**[P1] `gpxError` state leaks across route switches.** `downloadGpx()` sets `gpxError.value = true` on parse failure, but the route-change watcher never resets it. A user who hits a GPX error on Route A and then opens Route B — or re-opens Route A later in the session — can see a stale "GPX 資料格式有誤" error that has nothing to do with the currently-open route's actual data.
**Why it matters:** in a trip-planning flow where users click through several routes in one sitting the night before, this is a believable path to a false "your GPX is broken" reading on a route that's actually fine.
**Fix:** add `gpxError.value = false` inside the existing item-change watcher, alongside the `activeTab`/`activeWptIndex` resets.
**Suggested command:** `/impeccable harden`

**[P1] Four hardcoded colors survived the token migration, with real light-mode consequences.** `.hydrology-copy strong { color: #ddd }` is the station-name text in hydrology rows — a decision-relevant label — and doesn't re-theme, producing light-gray-on-light-panel in light mode. `.status-strip.tone-strip-danger/warning/watch` backgrounds are hardcoded rgba literals of the dark-theme hues (not `color-mix()` like 6+ other places in this same file), so in light mode the strip's tint stays dark-keyed while its text correctly re-themes — a background/foreground mismatch. The elevation-chart's ascent color (`#e63946`/`rgba(230,57,70,.18)`) doesn't match `--color-danger` (`#e87979`) in either theme — a fifth, unrelated red.
**Why it matters:** this directly contradicts "migration complete, verified in both themes" — it wasn't quite complete, and the station-name contrast issue is a real legibility bug for a field users read while deciding whether nearby water levels are current.
**Fix:** swap all four to the `var(--color-*)`/`color-mix()` pattern already used elsewhere in this file.
**Suggested command:** `/impeccable polish`

**[P2] Grade tags in the Quick Info tab lack the accessibility treatment their header duplicates got.** The header's grade tags have `tabindex`, `aria-label`, and tap/hover/focus tooltips; the same grade data rendered again in the Quick Info tab's Grade block does not — a screen-reader user tabbing through Quick Info gets silent, unlabeled chips there (mitigated somewhat by adjacent plain-text explanation, so the information isn't fully lost, just not attached to the control).
**Why it matters:** this is the same P1 the last critique flagged, now fixed in one of its two renderings but not the other — an inconsistency a screen-reader user will actually hit.
**Fix:** either apply the same `aria-label`/`tabindex` treatment to the Quick Info instance, or collapse the two renderings into one shared pattern (see Assessment A's question #3 below).
**Suggested command:** `/impeccable adapt`

**[P2] Hydrology Retry buttons are more broadly scoped than they visually promise.** Both the water-row and rainfall-row Retry buttons call the same shared `loadNearbyHydrology()`, which resets and refetches both sources together. Tapping rainfall's Retry when only rainfall failed also flips the already-successful water reading back to a loading state and re-issues a redundant request.
**Why it matters:** not broken, but the two-button UI implies two independent actions; a user who taps rainfall's retry and watches water briefly re-loading may reasonably wonder what just happened to a station that was already fine.
**Fix:** split into `retryWater()`/`retryRainfall()` that only reset+refetch their own ref, or relabel as a single shared "Retry hydrology" action.
**Suggested command:** `/impeccable clarify`

**[P3] Hydrology tab's empty-state check only tests `d.hazards`, not `d.hazards_zh`.** A Taiwan route with only the Chinese hazards field populated and no nearby stations would render both the hazard info-block and the "尚無資料" empty-tab message simultaneously — two contradictory blocks in the same tab.
**Why it matters:** small but visibly broken state for exactly the Chinese-first data PRODUCT.md says is the common case for TW routes.
**Fix:** `!d.hazards && !d.hazards_zh` in the empty-tab condition.
**Suggested command:** `/impeccable harden`

## Persona Red Flags

**Riley (Stress Tester):** Confirmed the `gpxError` route-switch leak (P1) and the `hazards_zh`-only contradictory-empty-state (P3). Rapid-retry-clicking under flaky network is actually handled correctly — `hydrologyRequestId` guards against out-of-order responses, no red flag there.

**Sam (Accessibility-Dependent):** The header grade-tag fix is a genuine, complete win — real `aria-label` plus keyboard reachability, not cosmetic. But the Quick Info tab's duplicate grade tags got none of it (P2), and `.hydrology-copy strong`'s light-mode contrast gap (P1) specifically hits low-vision users switching themes.

**Casey (Distracted Mobile):** The abrupt tab-content swap when tapping the hazard/status strip has no visible transition, which could read as a mis-tap in bright daylight. The hazard banner's 2-line clamp has no "more" affordance — a distracted user skimming at night could miss that there's additional hazard text beyond what's shown.

## Minor Observations

- `.route-title` (the panel headline) is colored `var(--color-primary)` rather than `var(--color-text-strong)` — DESIGN.md's Headline spec doesn't call for blue specifically, and blue conventionally signals "link" rather than heading. Minor stylistic note, not a functional bug.
- GPX download gives no success confirmation (silent browser download) — standard behavior, but notable since every failure path now gets an explicit message while the happy path doesn't.
- `.info-sub` (11.52px) and `.eyebrow` (10.88px) both still trip the detector's undersized-text floor even though they sit inside DESIGN.md's informally-tolerated Caption range — a real tension between the project's documented flexibility and actual small-size legibility, worth a second look during a future typography pass.
- Mobile viewport behavior remains unverified this run (the same `resize_window` tooling limitation as the prior critique) — treat as unknown, not passing.

## Questions to Consider

- What if the hazard banner and status strip merged into one persistent "conditions" line instead of two stacked buttons that both jump to the same tab — would that free a row of vertical space on a 76dvh mobile sheet?
- What if Retry were scoped per-source from the start — would that make the two buttons actually mean what they visually promise?
- What if the tap-tooltip on grade tags opened the same inline `info-sub` explanation already used in Quick Info, unifying two implementations of "explain this grade" into one accessible pattern — resolving the Quick Info accessibility gap for free?
