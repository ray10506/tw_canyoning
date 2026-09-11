---
target: NzRouteDetail.vue (NZ route dossier panel)
total_score: 26
max_score: 36
na_heuristics: 10
p0_count: 1
p1_count: 2
target_identity: "file:D:\\docker\\npm\\side-project\\src\\components\\NzRouteDetail.vue"
target_fingerprint: "sha256:dcdfecedcec50a699c4e2ebeae149f9e9556dc530ad7e654c12c17aa698dc17c"
target_path: "D:\\docker\\npm\\side-project\\src\\components\\NzRouteDetail.vue"
timestamp: 2026-09-11T05-55-20Z
slug: src-components-nzroutedetail-vue
---
Method: dual-agent (A: design-review subagent · B: detector/browser-evidence subagent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Active tab/chip states clear; no loading state for async photo/topo images |
| 2 | Match System / Real World | 4 | Correct V/A/roman grading vocabulary throughout |
| 3 | User Control and Freedom | 3 | Close + tab switching work; mobile sheet has no drag-handle affordance |
| 4 | Consistency and Standards | 3 | Icon reuse now consistent (verified fix held); Risk tab still has stray inline `style=` attributes |
| 5 | Error Prevention | 3 | External links use `noopener`; little destructive surface to guard |
| 6 | Recognition Rather Than Recall | 3 | Grade + risk chip surface key facts up front, but risk chip carries no severity |
| 7 | Flexibility and Efficiency | 2 | `role="tablist"`/`role="tab"` present but no arrow-key roving-tabindex |
| 8 | Aesthetic and Minimalist Design | 2 | Header/Risk tab well-composed; Info tab still a flat 13-row list |
| 9 | Error Recovery | 3 | Good empty-state copy across tabs |
| 10 | Help and Documentation | n/a | Operate-mode reference panel; the dossier is the documentation |
| **Total** | | **26/36** | **Good (72%)** |

**Trend**: 22/36 (61%, Acceptable) → **26/36 (72%, Good)**.

## Design Specificity Verdict

**LLM assessment**: Still domain-authored, not a generic detail card — V/A/roman grade parsing, flood-risk cards, waypoint↔map cross-highlighting, and KiwiCanyons attribution are canyoning-specific. New nuance from this round: the dossier is specific to *canyoning* but not yet to *this product's* stated differentiator — PRODUCT.md's positioning is "route + live hydrology in one screen," but the NZ dossier's flood-risk text is static historical narrative, not live data the way the product's core pitch implies. Worth a copy fix (see Questions) even if live NZ hydrology data isn't in scope.

**Deterministic scan**: `detect.mjs --json` on the source file: clean, exit 0, empty array — consistent with the first run. New this round: the browser-injected live overlay succeeded (it failed last time due to a path issue) and surfaced **28 anti-pattern findings** on the rendered page. These are pre-existing baseline issues the static scan and the first critique's fallback screenshots couldn't see — not regressions introduced by this session's three fixes. Notable clusters:
- **10× low-contrast `dt` labels** — `#4e6a80` on `#0d1826` measures 3.1:1, below the 4.5:1 WCAG AA floor for body text. This is the same issue Assessment A flagged qualitatively in the first critique (Sam persona); now detector-confirmed with a number.
- **5× undersized functional text** (10px waypoint badges "01"–"05") and 2 more undersized text instances (9.5px eyebrow, 11.5px mono GPS text).
- **4× `ai-color-palette`** flags on cyan-on-dark elements (eyebrow, title, water-grade tag, active tab) — a stylistic flag, not necessarily a defect given this is a deliberately chosen dark-navy/cyan palette across the whole app, but worth a conscious look.
- 1× clipped-overflow container (map), 1× thin-border-wide-shadow combo, 1× kicker-above-heading pattern (expected/intentional here).

**Visual overlays**: Overlay is not persistently viewable (the subagent's tab was closed after capture), but the console output and screenshots were captured directly — see clusters above.

## Overall Impression

All three fixes from the last round held up under independent re-verification: the risk chip correctly jumps to the Risk tab, the icon collisions are gone, and the duplicated Grade/First-Descent rows are gone with no orphaned CSS. The score moved from Acceptable to Good. But the fixes exposed the next layer: the risk chip is now reliably reachable but carries no severity, so a user still has to open the tab to learn if "⚠ Risk" means mild caution or "flood risk: High." And the Info tab's flat 13-row list — flagged as P2 last time — is unchanged and was independently re-flagged this round as the most consequential remaining issue.

## What's Working

1. **The header risk chip is a verified, real fix** — clicking it flips `activeTab` to `'risk'` (confirmed live twice, by two different agents in two separate runs), integrated cleanly into the existing `.dos-grades` row.
2. **Icon collisions are actually resolved** — Elevation vs. Rock and GPX vs. Catchment now render distinct glyphs in both source and live screenshots; the GPS icon is now consistent across Info and Approach tabs.
3. **Real data handling** — JSON parsing for GPX/photos/sections is wrapped in try/catch with sane fallbacks, and waypoints drive real map cross-highlighting, not static placeholder content.

## Priority Issues

**[P0] Risk chip carries no severity** — Every route's header chip reads identically ("⚠ Risk") regardless of whether the underlying flood risk is low or "高" (High, as on Bartrum Creek). For a tool whose Product Principle #2 is a 30-second go/no-go call, the one indicator built to answer that call doesn't yet show the answer without a click. **Fix**: interpolate `details.flood`'s level into the chip label when present (e.g. "⚠ Flood: High"). → `/impeccable clarify` or a follow-up `/impeccable layout`

**[P1] Low-contrast field labels fail WCAG AA** — Detector-confirmed: `dt` labels measure 3.1:1 against a 4.5:1 floor, across all 10+ rows in the Info tab and repeated in every other tab's rows. **Fix**: lighten `--dim` (`#4e6a80`) enough to clear 4.5:1 on `#0d1826`, or reserve it for truly secondary/dim content and give field labels a mid-tone color. → `/impeccable audit` or `/impeccable colorize`

**[P1] Info tab is still a flat 13-row list with no sub-grouping** — Unaddressed from the first critique; independently re-flagged this round. Location, terrain, gear, and provenance links all sit at identical visual weight in one `<dl>`, while Timing and Approach already have a `.section-sub` heading pattern that Info doesn't reuse. **Fix**: split into 2-3 labeled groups (Location & Terrain / Access & Gear / Links & Credits). → `/impeccable layout`

**[P2] No recency signal on hazard/risk content** — The Updates tab explicitly warns "check the date... before relying on them," but the Risk tab's flood-severity tag and hazard notes carry the identical staleness risk with no date or caveat. **Fix**: surface a source date next to the risk block, or reuse the Updates tab's disclaimer copy. → `/impeccable clarify`

**[P2] Tab bar lacks keyboard arrow navigation despite its own ARIA contract** — `role="tablist"`/`role="tab"` are present, implying the WAI-ARIA tab pattern, but there's no roving-tabindex/arrow-key handler; keyboard and screen-reader users must Tab sequentially through up to 8 buttons. **Fix**: add left/right arrow handling across `.dos-tab` elements. → `/impeccable harden`

## Persona Red Flags

**Jordan (First-Timer)**: Grade badges assume V/A/roman fluency with nothing in-panel explaining them — no link to the `DifficultyGuide` component that already exists elsewhere in the app. Someone landing on a shared link for a `V6 A6 VI ★★★★★` route has no way to gauge how extreme that is without leaving the dossier.

**Sam (Accessibility)**: Keyboard tab-navigation gap above. Also, `.dos-close` — the panel's primary escape hatch — has no custom `:focus-visible` styling while the new risk chip does, so the most-used dismissal control falls back to default browser focus indication.

**Casey (Mobile)**: Confirmed live — the mobile bottom-sheet has no drag-handle affordance signaling it's dismissible (only the ✕). At narrow widths, the header's 5-item chip row (grade + water + roman + stars + new risk chip) can wrap the risk chip to a second line, weakening the "always-visible at a glance" promise on exactly the device PRODUCT.md names as the primary field-use context.

## Minor Observations

- Inline `style="margin-top:8px"` / `style="padding:12px 20px"` in the Risk tab template bypass the scoped stylesheet, inconsistent with the rest of the file's authoring.
- GPS coordinates are duplicated verbatim in Info and Approach tabs with no cross-reference between them.
- Emoji-glyph icons render as flat monochrome fallback marks on some platforms (detector flagged several as undersized/functional text); a small inline SVG set would be more robust given the file already loads custom web fonts.
- The desktop panel's `resize: both` (still present, parked as P3 from the first critique) remains untested/unrequested flexibility across the current 70+ TW and 12 NZ routes.

## Questions to Consider

- If the product's core promise is a 30-second go/no-go decision, why does the highest-stakes fact (flood-risk severity) still require opening the Risk tab to read, when the header chip was built specifically to surface it?
- The TW side of the app is moving toward *live* water/rainfall data (PRODUCT.md backlog item 1) — should the NZ dossier's flood-risk text be relabeled "historical/typical risk" so users don't mistake KiwiCanyons' static narrative for the live signal the rest of the app is training them to expect?
- Is the panel's draggable-corner `resize: both` something anyone has actually used, or inherited generic-widget flexibility nobody asked for?
