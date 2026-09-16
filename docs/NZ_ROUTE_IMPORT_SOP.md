# New Zealand Route Import SOP

Use this workflow whenever a KiwiCanyons route URL is added to the project. The goal is one complete `nz_routes` record that works in the existing NZ route panel without follow-up cleanup.

Shared rules: follow [DATA_MODEL.md](./DATA_MODEL.md) for data contracts, [SOURCE_AND_LICENSE_POLICY.md](./SOURCE_AND_LICENSE_POLICY.md) for reuse rights, and [ADMIN_REVIEW_SOP.md](./ADMIN_REVIEW_SOP.md) plus [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) for publishing.

## Input

Required:

```text
KiwiCanyons route URL: https://www.kiwicanyons.org/example-route/
```

Optional:

- Written permission covering photos, topo images, PDF pages, or GPX redistribution.
- Additional GPX or coordinates supplied by the route author.
- Corrections from a first-hand trip report.

## Completion rule

A route is complete only when:

1. Every source listed below has been checked, including lazy-loaded galleries and embedded media.
2. Every published field has been captured in English and Traditional Chinese where the UI supports both.
3. Missing information is stored as `Not published` / `未公布`, never guessed.
4. Coordinates and every external link have been opened and verified.
5. The route renders correctly in both desktop and mobile NZ panels.
6. `npm run build` passes.
7. The user has reviewed the diff before any Git push.

## Source order

Use sources in this order and retain their URLs:

1. KiwiCanyons route page.
2. The route's current downloadable topo PDF or canyon guide.
3. GPX explicitly published for that route.
4. Recent trip reports and comments on the route page.
5. MetService forecast page for the route's actual region.
6. An elevation service, using the verified canyon entry coordinate.
7. Every image, attachment, and embedded YouTube/Vimeo link on the route page.

Do not merge conflicting values silently. Prefer the newest dated official topo, then record newer trip-report changes in `recent_updates` instead of overwriting the topo description.

## Rights gate

Before copying any media, confirm that its licence or written permission allows republication on this website.

- No permission: keep `source_url`, `topo_url`, video links, and GPX source links only. Do not download or rehost photos, topo pages, or GPX.
- Permission confirmed: save only the assets allowed by that permission and record the creator/source.
- Photos: maximum four representative photos per route.
- `topo_pages`: only the approach/location map and hand-drawn canyon topo. Do not include narrative PDF pages or photos already used in `photos`.
- Videos: store external links only; do not download the video.

Attribution is required even when reuse is permitted. A source link by itself does not grant permission.

## Extract all route information

### Identity and location

- `name`: official route name.
- `name_en`: English name when different from `name`.
- `region`: Chinese country and area label.
- `region_en`: English country and area label.
- `location` / `location_zh`: specific valley, road, national park, or access location.
- `gps`: verified canyon entry coordinate as `latitude, longitude`.
- `elevation`: entry elevation in metres. Prefer GPX/topo elevation; otherwise query the existing elevation service.
- `gpx_waypoints`: every useful published coordinate in travel order, including parking, track junctions, huts, entries, exits, flow gauges, and hazards.

Waypoint format:

```js
{ seq: 1, lat: -43.00000, lon: 170.00000, name: 'Waypoint name', detail: 'What it is and how it is used.' }
```

Every coordinate must land on the intended road, track, ridge, creek, or structure when opened in Google Maps or a suitable NZ topographic map.

### Difficulty and summary

- `grading`: complete `v# a# Roman ★` grade. Preserve every published component.
- `max_drop`: largest single rappel/drop, not total vertical relief.
- `subtitle` / `subtitle_zh`: one short route description.
- `character` / `character_zh`: terrain and canyon character.
- `first_descent`: date/year and names exactly as published.

### Timing and access

- `approach_time`: approach only.
- `descent_time`: canyon descent only.
- `return_time`: exit/return only.
- `total_time`: realistic total from the same source.
- `approach_steps`: ordered bilingual access instructions.
- `route_sections`: separate every published route option or section.

Do not combine timings for different entries. When upper, middle, lower, or full routes have different times, each `route_sections` item must contain its own `approach_time`, `descent_time`, `return_time`, and total `time`.

```js
{
  name: 'Full canyon',
  zh: '全段',
  time: '8 hrs',
  detail: 'Important section-specific information.',
  approach_time: '2 hrs',
  descent_time: '5 hrs',
  return_time: '1 hr'
}
```

### Technical and risk information

- `details.map_sheet`
- `details.rock` / `details.rock_zh`
- `details.water` / `details.water_zh`
- `details.catchment` / `details.catchment_zh`
- `details.anchors` / `details.anchors_zh`
- `details.flood` / `details.flood_zh`
- `gear` / `gear_zh`
- `hazards` / `hazards_zh`

Keep observed facts separate from safety conclusions. Do not state that a route is safe based on rainfall, forecast, or a historic trip report.

### Current information and media

- `recent_updates`: summarize dated access changes, damaged anchors, floods, logjams, pool-depth changes, and other material reports. Keep author and date.
- `videos`: title, external URL, and provider.
- `photos`: up to four permitted representative image URLs or local assets.
- `topo_url`: current official PDF URL.
- `topo_page`: principal canyon-topo page number.
- `topo_pages`: every permitted map/topo image required to understand the route.
- `gpx_url`: permitted downloadable GPX path or original external URL.
- `gpx_track`: parsed map track in the existing JSON shape when redistribution is permitted.
- `source_url`: canonical KiwiCanyons route URL.

Structured values must follow the helper shapes already used in `scripts/sync-nz-topos.mjs`: `page`, `step`, `section`, `update`, and `video`.

Before choosing assets, make a complete media inventory rather than relying on the first visible image. WordPress galleries often lazy-load full-resolution URLs, and topo images may appear inside the photo gallery instead of as a PDF download. Classify every item as approach map, canyon topo, representative photo, video, or unrelated site artwork; then keep only the route-relevant items.

## Add the record

1. Add the PDF URL to `PDF` in `scripts/sync-nz-topos.mjs` when applicable.
2. Add one complete entry to `ROUTES`, keyed by the exact PocketBase `name`.
3. Save permitted topo images under `public/topos/nz/<slug>-<descriptor>.jpg`. Use a descriptor that identifies the content — `map` for approach maps, `topo` for hand-drawn topos, or the original PDF page number for pages extracted from the canyon guide (for example `bartrum-23.jpg`). Do not pad with a plain `1`, `2`, `3` sequence when a more descriptive name is possible.
4. Save permitted local photos under `public/photos/nz/`.
5. Save permitted GPX under `public/gpx/nz/`, parse its track, and downsample only enough to fit the current `gpx_track` field.
6. If the region is not already covered, add and verify its MetService mapping in `NZ_FORECASTS` inside `src/components/NzRouteDetail.vue`.
7. Run a single-route sync, not a full overwrite. The script derives the expected database count from `ROUTES`; do not add a separate hard-coded count:

```powershell
$env:PB_EMAIL='...'
$env:PB_PASSWORD='...'
node scripts/sync-nz-topos.mjs "Exact Route Name"
```

**Important constraint:** on every run — including single-route syncs — the script validates that every record currently in the database has a matching entry in `ROUTES`. If a `ROUTES` entry is removed while its database record still exists, all syncs will fail. Always delete the database record before removing it from `ROUTES`, not after.

Never store PocketBase credentials in source files, documentation, shell history, or Git.

## Verification checklist

### Data

- [ ] Route name and canonical URL match.
- [ ] Grade includes V, A, Roman commitment grade, and published stars.
- [ ] GPS opens at the actual canyon entry.
- [ ] Elevation matches the entry point.
- [ ] Approach, descent, return, and total times are not mixed between route options.
- [ ] Max drop is not confused with total elevation loss.
- [ ] Every PDF map/topo page has been checked; none are omitted or duplicated.
- [ ] The full route-page gallery and every embedded YouTube/Vimeo link have been checked, including lazy-loaded originals.
- [ ] Map/topo images found inside a gallery are stored in `topo_pages`, not mixed into representative `photos`.
- [ ] A supplied GPX has been opened, its start/end checked, and its rendered track verified on the map.
- [ ] Recent reports include dates and do not get presented as permanent facts.
- [ ] All unknown fields explicitly say `Not published` / `未公布` or remain absent when the panel intentionally hides them.
- [ ] Weather link opens the correct region, not merely the nearest similarly named town.
- [ ] Media and GPX have documented reuse permission before being rehosted.

### UI

- [ ] Route appears under the NZ sidebar tab and focuses New Zealand.
- [ ] Sidebar shows the complete grade, including the Roman numeral.
- [ ] Panel header shows one grade only and displays elevation.
- [ ] Info, Weather, Plan, Topo, Photos, Risk, and optional Updates tabs contain the expected data.
- [ ] Every panel GPS/waypoint opens the matching Google Maps location.
- [ ] Hovering a waypoint focuses the matching map marker.
- [ ] GPX track and waypoints render in the correct place.
- [ ] Topo images open in a new tab and retain readable resolution.
- [ ] Panel has bottom spacing and remains usable at its minimum and maximum width.
- [ ] At most four representative photos load.
- [ ] Desktop and a narrow mobile viewport have no clipped controls or overlapping content.

### Final checks

```powershell
npm run build
git diff --check
git status --short
```

Do not push. Present the changed files, source URLs, unresolved fields, and verification result for user review.

## Reusable request

Paste this with the route URL:

```text
依照 docs/NZ_ROUTE_IMPORT_SOP.md 新增這條紐西蘭溪降路線：
<KIWICANYONS_URL>

完整檢查路線頁、topo PDF、GPX、近期回報、影片、GPS、海拔與對應 MetService 預報。
未公布的資料不要猜。沒有明確授權的照片、topo 或 GPX 不要下載重放，只保留外部連結。
寫入 PocketBase 後完成桌面與手機版驗證，但不要推 Git。
```
