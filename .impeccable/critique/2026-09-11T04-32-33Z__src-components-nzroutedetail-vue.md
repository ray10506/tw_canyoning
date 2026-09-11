---
target: NzRouteDetail.vue (NZ route dossier panel)
total_score: 22
max_score: 36
na_heuristics: 10
p0_count: 1
p1_count: 2
target_identity: "file:D:\\docker\\npm\\side-project\\src\\components\\NzRouteDetail.vue"
target_fingerprint: "sha256:bbc357cc9ed3db99b2c1797cbbbde2969ebcf6830cebc676aa969c1a1435ece5"
target_path: "D:\\docker\\npm\\side-project\\src\\components\\NzRouteDetail.vue"
timestamp: 2026-09-11T04-32-33Z
slug: src-components-nzroutedetail-vue
---
Method: dual-agent (A: design-review subagent · B: detector/browser-evidence subagent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Explicit empty states, but no loading indicator while GPX/photo JSON parses |
| 2 | Match System / Real World | 4 | Grading kept in native V/A/roman idiom, no forced generic-hiking translation |
| 3 | User Control and Freedom | 3 | Close + free tab switching work; no Escape-to-close, no route comparison |
| 4 | Consistency and Standards | 2 | `△` icon reused for both Elevation and Rock; `⌁` reused for Catchment and GPX |
| 5 | Error Prevention | 3 | External links use `noopener`; little destructive interaction to guard |
| 6 | Recognition Rather Than Recall | 1 | Tab bar hides overflow with no scrollbar/fade/chevron — Risk tab clipped off-screen in live test |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts, no deep-link-to-tab |
| 8 | Aesthetic and Minimalist Design | 2 | Grade badges and first-descent credit each rendered twice |
| 9 | Error Recovery | 2 | Malformed GPX JSON silently swallowed by try/catch, renders as indistinguishable "—" |
| 10 | Help and Documentation | n/a | Operate-mode reference panel; the dossier is the documentation |
| **Total** | | **22/36** | **Acceptable (61%)** |

## Design Specificity Verdict

**LLM assessment**: Authored specifically at the content layer — the V/A/roman-numeral grading parser, flash-flood risk cards, GPS waypoint↔map hover linking, and shuttle/approach/gear rows are unmistakably canyoning-domain, not a generic "detail card" filled with placeholder fields. The *chrome* (pill tabs, `dl/dt/dd` icon-label rows, dark dashboard palette), though, is a fairly generic technical-spec-sheet visual language that could sit on top of any inventory of facts. Specificity credit goes to content modeling, not layout invention.

**Deterministic scan**: `detect.mjs --json src/components/NzRouteDetail.vue` (run from repo root against the skill's absolute path) returned a clean result — exit 0, empty findings array. No mechanical over-engineering/pattern violations flagged. (Note: Assessment B's subagent first tried a repo-relative `.claude/skills/impeccable/scripts/detect.mjs`, which doesn't exist in this project since the skill lives at user level, not project level — I reran it directly from the correct absolute path.)

**Visual overlays**: Browser-injected overlay (`detect.js`) was not obtained — same relative-path issue prevented `live-server.mjs` from starting inside the subagent. No live overlay is available in a `[Human]` tab; the fallback signal is the clean CLI scan plus manual screenshots from both assessments (both independently captured the dossier open on route "Bartrum Creek" and both independently found the tab bar overflowing/clipping the Risk tab at normal desktop width — that's two isolated agents converging on the same live defect, which is stronger evidence than either alone).

## Overall Impression

The content model is genuinely domain-authored and the progressive-disclosure discipline (conditional rows/tabs, no empty sections) is a real strength that pays off a specific backlog item in PRODUCT.md. But the panel undermines its own stated purpose: this tool's #1 product principle is hydrology/safety-first, 30-second go/no-go decisions, and the one tab carrying that decision — Risk — is neither the default view nor reliably visible, confirmed by both independent assessments clipping off-screen in the same live test.

## What's Working

1. **Progressive disclosure is real, not decorative** — nearly every row and several tabs (`updates`, `videos`) are conditionally rendered only when data exists, directly executing PRODUCT.md's backlog ask to avoid empty fields/tabs on sparse routes.
2. **Cross-panel micro-interaction** — hovering a waypoint's coordinates emits `focus-waypoint`, highlighting the matching marker on the Leaflet map. A small, domain-aware touch, not boilerplate.
3. **Trust-calibrated copy on crowd-sourced data** — the Updates tab explicitly hedges: "check the date and original report before relying on them." Appropriate caution for safety-adjacent user-submitted content.

## Priority Issues

**[P0] Safety-critical Risk tab is neither default nor reliably reachable**
- **Why it matters**: `.dos-tabs` scrolls horizontally with `scrollbar-width:none` and no fade/chevron cue. Both assessments independently confirmed the Risk tab clipped off-screen at normal desktop width, with default tab set to `info`, not `risk`. For a tool whose stated principle is a hydrology-first 30-second go/no-go call, the exact content that answers that call is the hardest tab to find.
- **Fix**: Surface a persistent flood-risk indicator in the always-visible header (next to the grade badges), and add a visible overflow affordance to `.dos-tabs` (edge fade or chevrons) when `scrollWidth > clientWidth`.
- **Suggested command**: `/impeccable layout`

**[P1] Icon collisions break scan reliability**
- **Why it matters**: `△` labels both "Elevation" and "Rock"; `⌁` labels both "Catchment" and "GPX" in a narrow icon-first column meant for fast visual scanning. Reusing glyphs across unrelated fields actively misleads rather than aids recognition.
- **Fix**: Assign each field a unique icon.
- **Suggested command**: `/impeccable typeset`

**[P1] Grade badges and first-descent credit are each duplicated**
- **Why it matters**: The grade/star tags render identically in the header (`dos-grades`) and again in the Info tab body (`grade-inline`) a few hundred pixels below with zero new information, consuming space in an already 15-row list. `first_descent` likewise repeats verbatim across Info and Timing tabs.
- **Fix**: Delete the in-body grade row; keep `first_descent` only in the Timing tab.
- **Suggested command**: `/impeccable distill`

**[P2] Info tab has no internal chunking**
- **Why it matters**: A single flat list holds up to 15 sequential fields spanning terrain, logistics, and provenance at identical visual weight — violates the ≤4-items-per-group cognitive-load guideline, even though the file already has a `.section-sub` heading pattern used elsewhere (Timing, Approach) that could organize this.
- **Fix**: Split into 2-3 labeled sub-groups (Location & Terrain / Access & Gear / Links & Credits).
- **Suggested command**: `/impeccable layout`

**[P3] Unrestrained `resize: both` on the panel with no grip affordance**
- **Why it matters**: The dossier can be dragged to arbitrary sizes; a stray click near the edge can resize the panel unexpectedly, with no visible handle showing this is possible.
- **Fix**: Add a visible resize-grip indicator, or replace with a deliberate width toggle.
- **Suggested command**: `/impeccable polish`

## Persona Red Flags

**Sam (Accessibility-Dependent User)**: Close button is a bare "✕" at ~24px effective tap target, well under the ~44px guideline, on a panel also used as a mobile bottom sheet. Every field label (`dt`) uses a low-contrast blue-grey (`--dim`) on navy (`--bg`) that likely fails WCAG AA at this pervasive a scale. `role="tab"`/`aria-selected` are present but arrow-key tab navigation is not implemented — a half-built ARIA tab pattern that promises screen-reader semantics the keyboard interaction doesn't back up.

**Riley (Deliberate Stress Tester)**: Malformed `gpx_track`/`gpx_waypoints` JSON is silently swallowed by a bare `try{}catch{}`, rendering the same "—" shown for genuinely absent data — no diagnostic signal distinguishes broken data from missing data. Tabs (`info`/`timing`/`approach`/`topo`/`risk`) always render regardless of whether any field inside has data, forcing a stress-tester on a sparse route through several empty-state tabs in a row.

**Casey (Distracted Mobile User)**: The `@media (max-width:640px)` block turns the panel into a fixed-height bottom sheet, but the tab-overflow problem (P0) gets strictly worse on a 400px screen since tab padding is unchanged from desktop — fewer tabs fit before clipping, on exactly the viewport PRODUCT.md says canyoners use "day-of."

## Minor Observations

- Icon system mixes emoji (📍🥾📊🌊) with hand-picked Unicode glyphs (△≈⌁⌾), rendering inconsistently across OS/browser emoji fonts.
- `locale === 'en' ? x : y` ternaries repeat ~40+ times inline rather than through one localization helper — makes it easy for one field's fallback to silently drift out of sync with the other nine.
- `@import url(fonts.googleapis...)` sits inside this component's own scoped `<style>` rather than a shared stylesheet — likely refetched per mount.
- Roman-numeral and star-rating tags have no tooltip explaining the scale, fine for the primary Taiwanese audience but a gap if NZ routes are meant to also reach international canyoners given the bilingual UI investment.

## Questions to Consider

- If Product Principle #1 is safety-first and #2 demands a 30-second go/no-go call, why is the one tab containing that answer (Risk) the one most likely to scroll off-screen undiscovered?
- Grade badges and first-descent credit each appear twice — is this panel assembled tab-by-tab without checking what's already visible elsewhere?
- CanyonList already ships a Taiwan grading-scale guide using the identical V/A/roman system — why doesn't this dossier link to it for a viewer who doesn't already know what "V4 A4 IV ★★★" means?
