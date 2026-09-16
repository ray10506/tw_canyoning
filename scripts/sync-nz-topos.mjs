import PocketBase from 'pocketbase'
import { readFileSync } from 'node:fs'

const email = process.env.PB_EMAIL
const password = process.env.PB_PASSWORD
if (!email || !password) throw new Error('PB_EMAIL and PB_PASSWORD are required')

const PDF = {
  wilson: 'https://www.kiwicanyons.org/wp-content/uploads/2012/01/Wilson-Creek.pdf',
  mather: 'https://www.kiwicanyons.org/wp-content/uploads/2025/03/Mather-Creek-CanyonTopo-202503-1.pdf',
  cross: 'https://www.kiwicanyons.org/wp-content/uploads/2013/01/Cross-Creek-Canyon-2022.pdf',
  whio: 'https://www.kiwicanyons.org/wp-content/uploads/2024/01/Whio-Creek-Canyo-topo.pdf',
  waitaha: 'https://www.kiwicanyons.org/wp-content/uploads/2025/01/Guide-to-the-Waitaha-Valley-Canyons-11-Feb-2025.pdf',
  imp: 'https://www.kiwicanyons.org/wp-content/uploads/2022/02/Imp-Grotto-v4a3II.pdf',
  red: 'https://www.kiwicanyons.org/wp-content/uploads/2018/01/Red-Granite-Creek.pdf',
  mayhem: 'https://www.kiwicanyons.org/wp-content/uploads/2018/05/Major-Mayhem-v5a3IV.pdf',
  general: 'https://www.kiwicanyons.org/wp-content/uploads/2026/05/20180402-The-General-v5a3VI-full-topo-.pdf',
  robinson: 'https://www.kiwicanyons.org/wp-content/uploads/2024/01/Robinson-Creek-CanyonTopo-updated-Jan-24.pdf',
  falls_hollyford: 'https://www.kiwicanyons.org/wp-content/uploads/2021/02/20260113-Falls-Creek-Hollyford-Topo-V4.pdf',
  dickson: 'https://www.kiwicanyons.org/wp-content/uploads/2022/05/Dickson-River-v2.0.pdf',
}

const page = (page, asset, en = 'Topo', zh = '路線圖') => ({ page, asset, en, zh })
const step = (en, zh) => ({ en, zh })
const section = (name, zh, time, detail = '', timing = {}) => ({ name, zh, time, detail, ...timing })
const update = (date, author, en, zh) => ({ date, author, en, zh })
const video = (title, url, provider) => ({ title, url, provider })

function readGpxTrack(path, sampleCount = 300) {
  const gpx = readFileSync(new URL(path, import.meta.url), 'utf8')
  const points = [...gpx.matchAll(/<trkpt lat="([^"]+)" lon="([^"]+)"[^>]*>(.*?)<\/trkpt>/gs)].map(match => {
    const elevation = match[3].match(/<ele>([^<]+)<\/ele>/)?.[1]
    return [Number(match[1]), Number(match[2]), ...(elevation ? [Math.round(Number(elevation))] : [])]
  })
  if (!points.length || points.some(point => point.some(value => !Number.isFinite(value)))) throw new Error(`Invalid GPX: ${path}`)
  const length = Math.min(sampleCount, points.length)
  return Array.from({ length }, (_, index) => points[Math.round(index * (points.length - 1) / Math.max(1, length - 1))])
}

const generalTrack = readGpxTrack('../public/gpx/nz/the-general-intermedio.gpx')
const barrackTrack = readGpxTrack('../public/gpx/nz/barrack-walk-in.gpx')

const ROUTES = {
  'Wilson Creek': {
    source_url: 'https://www.kiwicanyons.org/wilsons-creek/', topo_url: PDF.wilson, topo_page: 2,
    grading: 'v5 a4 IV ★★★', max_drop: '17m', first_descent: '2004 Alain Rohr & Ondrej Havlicek',
    gps: '-44.0811729, 169.3587036', elevation: 671,
    approach_time: '1 hr 15 min – 1 hr 45 min', descent_time: '3–5 hrs', return_time: '15 min', total_time: '4–7 hrs',
    details: { map_sheet: 'BZ13 Haast Pass', rock: 'Dark grey schist', rock_zh: '深灰色片岩', water: 'Moderate to high; normal flow is about 1 m³/s', water_zh: '中至高水量；正常水量約 1 m³/s', catchment: '4.9 km²', anchors: 'Double-bolt anchors', anchors_zh: '雙螺栓確保點', flood: 'Extreme', flood_zh: '極高' },
    approach_steps: [
      step('Park south of the SH6 bridge and follow the Didymo sign to the old bridge.', '停在 SH6 橋南側，從 Didymo 告示牌旁前往舊橋。'),
      step('Climb the faint spur trail, then sidle west near the 820 m contour.', '沿不明顯稜線路跡上升，在約 820 m 等高線向西橫切。'),
      step('Cross the unmarked creek near 800 m, descend the steep spur for 15 minutes, then walk 5 minutes downstream.', '在約 800 m 橫越未標示支流，沿陡稜下降約 15 分鐘，再順溪下行 5 分鐘入峽。'),
    ],
    route_sections: [section('Main canyon', '主峽谷', '3–5 hrs', 'Deep, committing schist slot with very limited escape options.')],
    topo_pages: [page(1, '/topos/nz/wilson-map.jpg', 'Approach map', '進場地圖'), page(2, '/topos/nz/wilson-2.jpg')],
    recent_updates: [update('2026-01-22', 'Dan Clearwater', 'A major flood substantially changed the canyon floor. Most pools are gravel-filled and the former jumps are currently shallow. R8/R9 and the final section have changed; anchors were usable, but carry repair equipment and inspect every feature.', '大型洪水已大幅改變溪床，多數水潭被礫石填滿，原有跳水目前偏淺。R8／R9 與末段地形已改變；當次回報固定點可用，但仍應攜帶維修裝備並逐一確認。')], videos: [],
  },
  'Mather Creek': {
    source_url: 'https://www.kiwicanyons.org/mathers-creek/', topo_url: PDF.mather, topo_page: 3,
    gps: '-44.0109024, 169.3578491', elevation: 546,
    approach_time: '1 hr 45 min', descent_time: '4–5 hrs', return_time: '15 min', total_time: '6–7 hrs',
    details: { map_sheet: 'BY13 Lake Paringa', rock: 'Schist with a volcanic dyke', rock_zh: '片岩與火山岩脈', water: 'Moderate', water_zh: '中等水量', catchment: '5.2 km²', anchors: 'Fully double bolted', anchors_zh: '全線雙螺栓確保點', flood: 'Moderate', flood_zh: '中等' },
    approach_steps: [
      step('Start at Pleasant Flat Campground and cross the Haast River toward Muir Creek.', '從 Pleasant Flat Campground 出發，涉行 Haast River 往 Muir Creek。'),
      step('Follow Muir Creek to Mather Creek and inspect flow at The Arch.', '沿 Muir Creek 至 Mather Creek，先在 The Arch 檢查水量。'),
      step('Backtrack about 100 m and follow the terrace/ridge route marked by orange PVC to the canyon entry.', '回走約 100 m，沿 terrace／ridge 路線與橘色 PVC 標記前往入溪點。'),
    ],
    route_sections: [section('Upper', '上段', '', 'Includes the Bog of Despair approach.'), section('Middle', '中段', '', 'R13 has a false-floor hazard.'), section('Lower', '下段', '', 'R15 has a circulating pool; R17 crosses the flow.')],
    topo_pages: [page(1, '/topos/nz/mather-map.jpg', 'Approach map', '進場地圖'), page(3, '/topos/nz/mather-3.jpg')],
    recent_updates: [update('2026-01-01', 'Oscar', 'The marked approach and GPX were easy to follow. Most pools remained deep, but several hangers were loose and one hanger/bolt was missing at R10b.', '進場標記與 GPX 清楚，多數水潭仍深；但多個掛片鬆動，R10b 有一組掛片／螺栓缺失。')],
    videos: [video("New Zealand's Natural Water Slide PARADISE - Mathers Creek, Haast Pass", 'https://www.youtube.com/watch?v=cLgC-Otjp1I', 'YouTube')],
  },
  'Cross Creek': {
    source_url: 'https://www.kiwicanyons.org/cross-creek/', topo_url: PDF.cross, topo_page: 3,
    gps: '-44.0975723, 169.3532104', elevation: 651,
    approach_time: '0–30 min', descent_time: '1–4 hrs', return_time: 'At the SH6 bridge', total_time: '1–4 hrs',
    details: { map_sheet: 'BZ13 Haast Pass', rock: 'Solid schist', rock_zh: '堅硬片岩', water: 'Cold, moderate flow', water_zh: '低溫、中等水量', catchment: '3 km²', anchors: 'Fully bolted commercial route', anchors_zh: '商業路線，全線螺栓確保點', flood: 'Moderate; upper section is inescapable', flood_zh: '中等；上段無法撤退' },
    approach_steps: [step('Choose the lower, middle or upper entry from SH6; the bridge is the exit.', '由 SH6 選擇下段、中段或上段入口，橋邊即為出溪點。'), step('Decontaminate all equipment after the trip because Didymo is present.', '溪中有 Didymo，完成後必須徹底消毒裝備。')],
    route_sections: [
      section('Lower only', '只走下段', 'About 1 hr', '', { approach_time: '10 min', descent_time: '1 hr', return_time: 'At SH6 bridge' }),
      section('Middle + lower', '中段＋下段', 'About 3 hr 20 min', '', { approach_time: '20 min', descent_time: '3 hrs', return_time: 'At SH6 bridge' }),
      section('Full canyon', '全段', 'About 4 hrs', 'Upper section has no easy escape.', { approach_time: '30 min', descent_time: '3 hr 30 min', return_time: 'At SH6 bridge' }),
    ],
    topo_pages: [page(1, '/topos/nz/cross-map.jpg', 'Approach map', '進場地圖'), page(2, '/topos/nz/cross-2.jpg', 'Lower section', '下段'), page(3, '/topos/nz/cross-3.jpg', 'Middle and upper sections', '中段與上段')],
    recent_updates: [update('2026-02-11', 'Dan Clearwater', 'A major flood moved rocks, timber and gravel. The arch pool and several jump or slide pools are now shallow or blocked. One approach hanger at R6 is missing and a rear bolt at R10 is spinning.', '大型洪水移動大量岩石、漂木與礫石。拱門池及多個跳水／滑瀑池目前偏淺或受阻；R6 進場掛片缺失，R10 後側螺栓會轉動。')],
    videos: [video('Cross Creek, New Zealand Canyoning', 'https://www.youtube.com/watch?v=DG7SwJsAFdE', 'YouTube')],
  },
  'Whio Creek': {
    source_url: 'https://www.kiwicanyons.org/whio-creek/', topo_url: PDF.whio, topo_page: 2,
    gps: '-44.6364136, 167.9964142', elevation: 261,
    approach_time: '2 hrs 30 min', descent_time: '2 hrs 30 min', return_time: '2 hrs 15 min', total_time: '7 hrs 15 min',
    details: { map_sheet: 'Milford / Tutoko', rock: 'Solid granite', rock_zh: '堅硬花崗岩', water: 'Low to normal; deep turquoise pools', water_zh: '低至正常水量；深藍綠色水潭', catchment: 'Not published', catchment_zh: '未公布', anchors: 'Single bolts with maillons; jump/slide hangers', anchors_zh: '單螺栓與梅隆鎖；跳水／滑瀑吊片', flood: 'No easy escape after the first drop', flood_zh: '第一落差後至倒數第二段前無容易撤退點' },
    approach_steps: [step('Park at Tutoko Bridge and follow the Tutoko Valley track for about 2.5 hours.', '從 Tutoko Bridge 停車，沿 Tutoko Valley 步道約 2.5 小時。'), step('Cross the valley flats, ascend Whio Creek for 15 minutes, then scramble up mossy slabs on true right.', '穿越谷地平原，上溯 Whio Creek 約 15 分鐘，再沿真右岸苔蘚岩板上攀。')],
    route_sections: [section('Lower canyon', '下段', '2 hrs 30 min', 'Mostly jumps and slides through linked granite potholes; upper canyon remains unexplored.')],
    topo_pages: [page(1, '/topos/nz/whio-map.jpg', 'Location map', '位置地圖'), page(2, '/topos/nz/whio-2.jpg')],
    recent_updates: [update('2025-01-03', 'Will Hamilton', 'All anchors were reported in good condition. The pool below the final drop was shallower than before, and the fourth-drop slide required extra judgement.', '當次回報所有固定點狀況良好；最後落差下方水潭比過去淺，第四落差的滑瀑需更審慎判斷。')], videos: [],
  },
  'Bartrum Creek': {
    source_url: 'https://www.kiwicanyons.org/bartrum-creek/', topo_url: PDF.waitaha, topo_page: 21,
    gps: '-43.1438942, 170.7691193', elevation: 583,
    gpx_waypoints: [
      { seq: 1, lat: -43.11627, lon: 170.73021, name: 'DOC 步道轉折', detail: '由右岸小支流上切，再繞到崖壁上方。' },
      { seq: 2, lat: -43.13543, lon: 170.74661, name: 'Kiwi Flat Hut', detail: '第一天的過夜地點；從 DOC 步道轉折走到 Kiwi Flat Hut 約 3–4 小時。' },
      { seq: 3, lat: -43.14267, lon: 170.76460, name: '小溝橫渡', detail: '稜線上行途中需橫渡的小溝。' },
      { seq: 4, lat: -43.14547, lon: 170.76783, name: '稜線高點', detail: '抵達稜線頂點後陡下切進 Bartrum Creek。' },
      { seq: 5, lat: -43.13891, lon: 170.75478, name: '流量計岩石／出溪', detail: '最後一個瀑布的流量參考點，也是峽谷終點。' },
    ],
    approach_time: '2–3 hrs', descent_time: '3–6 hrs', return_time: '30 min', total_time: '5.5–9.5 hrs',
    details: { map_sheet: 'Waitaha Valley', rock: 'Bomber schist', rock_zh: '極堅硬片岩', water: 'High flow with deep pools', water_zh: '高水量與深潭', catchment: '5 km²', anchors: 'Double bolts and natural anchors', anchors_zh: '雙螺栓與天然確保點', flood: 'High', flood_zh: '高' },
    approach_steps: [step('Reach Kiwi Flat Hut via the legal river-margin route.', '沿合法河岸路線抵達 Kiwi Flat Hut。'), step('Leave the DOC track at -43.11627, 170.73021 and climb above the bluffs.', '在 -43.11627, 170.73021 離開 DOC 步道，爬升繞過崖壁。'), step('Cross the small gully at -43.14267, 170.76460, gain the ridge high point, then descend steeply into Bartrum Creek.', '在 -43.14267, 170.76460 橫越小溝，抵達稜線高點後陡降入 Bartrum Creek。')],
    route_sections: [section('Main canyon', '主峽谷', '3–6 hrs', 'Amphitheatres, jumps, slides and rappels into flushing pools.')],
    topo_pages: [page(23, '/topos/nz/bartrum-23.jpg', 'Approach map', '進場地圖'), page(24, '/topos/nz/bartrum-24.jpg', 'Topo 1', '路線圖 1'), page(25, '/topos/nz/bartrum-25.jpg', 'Topo 2', '路線圖 2')],
    recent_updates: [update('2025-03-29', 'Matt', 'The approach required careful navigation. Flow was below normal during this visit, water hazards were manageable, and several jumps were possible after checking.', '進場需要仔細導航。該次探訪水量低於正常值；回報者未遇到明顯水流問題，確認落水區後有數處可跳。')], videos: [],
  },
  'Gloomy Gorge': {
    source_url: 'https://www.kiwicanyons.org/gloomy-gorge/', topo_url: '', topo_page: 0,
    grading: 'v6a6VI ★★★★★',
    subtitle: 'Glacier-fed / Expedition White-water Canyon',
    subtitle_zh: '冰河融水 / 遠征型白水峽谷',
    max_drop: '~60 m',
    character: 'Glacier-fed, high-volume, expedition canyon; retreat is extremely difficult once committed to the core.',
    character_zh: '冰河融水、高水量、重裝遠征型、進後撤退困難',
    first_descent: '2013-03-09/10 Alain Rohr, Annette Phillips, Nic Barth, Neil Silverwood',
    gps: '-44.4377022, 168.6837463', elevation: 924,
    approach: 'Raspberry Creek Carpark → West Matukituki Track → Aspiring Hut → Pearl Flat → French Ridge Track → ~1,100 m off-track descent to canyon',
    approach_zh: 'Raspberry Creek Carpark → West Matukituki Track → Aspiring Hut → Pearl Flat → French Ridge Track → 約 1100 m 離開步道下切入溪',
    descent_time: '9.5–10+ hrs (canyon only)',
    total_time: 'Multi-day (3–4+ days)',
    hazards: 'Glacial meltwater — flow can rise rapidly on warm sunny afternoons. Hypothermia — extremely cold water, minimal direct sunlight, prolonged spray exposure. Hydraulic hazards — high water pressure, hydraulics / boiling pools / sieves / undercutting. Retreat — once in the core canyon there are very few positions from which you can quickly escape. Large amount of traverse / guideline work will significantly slow the team — efficiency is critical. Catchment of ~16 km² is a rough reference only, not a safety guarantee. This is a briefing summary; actual decisions should be based on current flow and team ability.',
    hazards_zh: '冰河融水：晴暖午後可能因融冰使流量急升。低溫失溫：水溫極低、深谷少日照、長時間噴濺。水流風險：大水壓、hydraulic / boiling pool / sieve / undercut。進脫困難：進入核心段後可快速離開的位置極少。大量 traverse / guideline 會明顯拖慢速度，隊伍效率極為重要。集水區約 16 km² 僅作快速參考，不等於安全保證。實際決策仍依當日水量與隊伍能力。',
    details: {
      map_sheet: 'Matukituki Valley',
      rock: 'Alpine gorge', rock_zh: '高山峽谷',
      water: 'Glacial meltwater; very high volume — inspect flow carefully before committing', water_zh: '冰河融水；水量極高，入溪前務必確認水況',
      catchment: '~16 km²', catchment_zh: '約 16 km²',
      anchors: '3 × 60 m main ropes (max drop ~60 m) + long handlines / guidelines / traverse lines',
      anchors_zh: '3 × 60 m 主繩（最大落差約 60 m）+ 長 handline / guideline / traverse line',
      flood: 'Extreme', flood_zh: '極高',
    },
    approach_steps: [
      step('Park at Raspberry Creek Carpark and start on the DOC West Matukituki Track.', '停在 Raspberry Creek Carpark，沿 DOC 的 West Matukituki Track 出發。'),
      step('Follow the track via Aspiring Hut toward Pearl Flat; Pearl Flat is the standard forward base / campsite.', '沿步道經 Aspiring Hut 前往 Pearl Flat；Pearl Flat 為常見前進基地 / 紮營點。'),
      step('Gloomy Gorge lies in the French Ridge side valley / gorge zone above Pearl Flat.', 'Gloomy Gorge 位於 Pearl Flat 上方的 French Ridge 側谷 / 峽谷區。'),
      step('Descend to the canyon entry as planned — allow substantial time for heavy packs and route-finding (~1,100 m off-track, off-trail navigation).', '依計畫下切至入溪點；重裝與離道找路時間不可低估（約 1100 m 離開步道）。'),
      step('The core canyon is a full expedition commitment — very few exit options exist once inside.', '進入核心峽谷後幾乎沒有快速退路，為不可逆的全程遠征承諾。'),
      step('Return walk-out to the carpark takes several hours; budget time for gear breakdown and the full track.', '回程步行返回停車場需數小時，需預留收裝與完整步道時間。'),
    ],
    route_sections: [
      section('Day 1', '第 1 天', '', 'Approach: Raspberry Creek → Pearl Flat. Establish forward base camp.', { zh_detail: '進場：Raspberry Creek → Pearl Flat，建立前進基地 / 紮營。' }),
      section('Day 2', '第 2 天', '', 'Move to canyon entry; begin descent. Bivy inside canyon if needed.', { zh_detail: '接近入谷、正式開始下降；必要時進行 canyon bivy。' }),
      section('Day 3', '第 3 天', '9.5–10+ hrs', 'Complete canyon descent and exit; begin walk-out.', { zh_detail: '完成下降、出谷 / 開始回程步行。' }),
      section('Day 4+', '備用天', '', 'Contingency day for weather / water conditions.', { zh_detail: '預備天，應對天氣或水量變化。' }),
    ],
    topo_pages: [page(1, '/topos/nz/gloomy-topo.jpg', 'Hand-drawn Topo (Nic Barth, 2013)', '手繪路線圖（Nic Barth, 2013）')],
    recent_updates: [
      { ...update('2024-03-01', 'Nic Barth et al.', 'Pre-staged the approach the day before and bivied below the first waterfall; completed 9.5 hrs of canyoning the following day. Video footage on Instagram.', '前一日完成進場並在第一瀑下方 bivy；次日 9.5 hr 完成 canyoning。影片記錄見 Instagram。'), url: 'https://www.instagram.com/reel/C5soeolr_zD/' },
      { ...update('2018-03-11', 'Sou Aikawa / Finetrack', '5-day expedition (March 11–15); 3 nights bivied inside the canyon. Finetrack Global blog includes photo documentation that is "as close to a picture topo as exists".', '5 天遠征（3/11–15），峽谷內 3 晚 bivy。Finetrack Global 部落格含豐富照片紀錄，被評為目前最接近圖解 topo 的資料。'), url: 'https://www.finetrackglobal.com/en_US/blog/new-zealand-gloomy-gorge-canyoning-expedition.html' },
      { ...update('2013-03-09', 'Nic Barth', 'First full canyoning descent (March 9–10). 20-hour push through the complete canyon with Alain Rohr, Annette Phillips and Neil Silverwood. Full trip report on Nic Barth\'s blog.', '首次完整峽谷下降（3/9–10），與 Alain Rohr、Annette Phillips、Neil Silverwood 共同完成，全程約 20 小時。'), url: 'https://travels.ncbarth.com/2013/03/gloomy-gorge-mar-9-10.html' },
      { ...update('2013-02-26', 'French Aotearoa Expedition', 'Six-day first exploration (Feb 26 – Mar 2): French team systematically installed equipment across the canyon over 5 days, connecting upper and lower sections on Day 6. Full account on the expedition blog.', '6 天首次探路（2/26–3/2）：法國隊用 5 天逐段架設設備，第 6 天完成上下段銜接。完整紀錄見探險部落格。'), url: 'https://aotearoaexpedition.wordpress.com/carnet-dexpedition/gloomy-gorge/' },
    ],
    videos: [video('Gloomy Gorge expedition - Part 1', 'https://www.youtube.com/watch?v=Gz7UG4kIhhk', 'YouTube'), video('Gloomy Gorge, March 2013', 'https://www.youtube.com/watch?v=SMB5OiTMSqI&t=39s', 'YouTube')],
  },
  'Imp Grotto': {
    source_url: 'https://www.kiwicanyons.org/imp-grotto/', topo_url: PDF.imp, topo_page: 2,
    gps: '-43.9533615, 169.2503967', elevation: 157,
    approach_time: '25 min', descent_time: '2 hrs', return_time: '1 min', total_time: '2 hrs 30 min',
    details: { map_sheet: 'BY12 Haast', rock: 'Solid schist along a fault line', rock_zh: '斷層上的堅硬片岩', water: 'Low to moderate, but dangerous even in low flow', water_zh: '低至中等水量；即使低水位仍有危險', catchment: '2.9 km²', anchors: 'Natural and bolted anchors', anchors_zh: '天然與螺栓確保點', flood: 'Extreme; avoid if rain is forecast', flood_zh: '極高；有降雨預報即不要進入' },
    approach_steps: [step('Park beside SH6 in the Haast Valley and follow the faint social trail through the cliff bands.', '在 Haast Valley 的 SH6 路旁停車，沿不明顯人跡穿越崖帶。'), step('Climb the gully to the rim, then descend to the canyon entry.', '沿溝槽爬升至峽谷邊緣，再下降至入溪點。')],
    route_sections: [section('Main canyon', '主峽谷', '2 hrs', 'Very narrow sculpted bedrock; water hazards intensify quickly.')],
    topo_pages: [page(1, '/topos/nz/imp-map.jpg', 'Approach map', '進場地圖'), page(2, '/topos/nz/imp-2.jpg')],
    recent_updates: [update('2026-01-27', 'Erwan', 'Gravel has filled several pools and a tree blocks the former slide after R1. R2 and the remaining anchors were reported usable; a new single anchor was added on true left.', '多個水潭已被礫石填高，R1 後原滑瀑底部有倒木阻擋。R2 與其後固定點當次可用，真左岸新增一個單點固定點。')],
    videos: [video('Canyoning in Imp Grotto', 'https://www.youtube.com/watch?v=qNBWdi2ex5M', 'YouTube')],
  },
  'Red Granite Creek': {
    source_url: 'https://www.kiwicanyons.org/red-granite-creek/', topo_url: PDF.red, topo_page: 2,
    gps: '-43.0027008, 170.8336334', elevation: 403,
    approach_time: '2 hrs', descent_time: '4 hrs 30 min', return_time: '30 min', total_time: '7 hrs',
    details: { map_sheet: 'BV18 Kokatahi', rock: 'Coarse granite', rock_zh: '粗粒花崗岩', water: 'Medium flow with deep, dark pools', water_zh: '中等水量與深色深潭', catchment: '11 km²', anchors: 'Double bolts and trees', anchors_zh: '雙螺栓與樹木確保點', flood: 'Low; many escape options', flood_zh: '低；沿途有多個撤退點' },
    approach_steps: [step('Drive into the Mikonui Valley and follow the marked foot approach shown on the official map.', '駕車進入 Mikonui Valley，再依官方地圖步行前往入溪點。'), step('Use the mapped exit before returning to the vehicle.', '由地圖標示出溪點離開並返回車輛。')],
    route_sections: [section('Main canyon', '主峽谷', '4 hrs 30 min', 'Open waterfalls and many deep pools. R9 is about 35 m in current reports.')],
    topo_pages: [page(1, '/topos/nz/red-granite-map.jpg', 'Approach map', '進場地圖'), page(2, '/topos/nz/red-granite-2.jpg')],
    recent_updates: [update('2026-02-04', 'Anthony Broatch / Nola Collie', 'Check every pool before jumping because submerged rocks can be difficult to see. The approach was well marked and anchor tape was replaced.', '跳水前必須逐一確認水潭，水色會讓水下大石難以辨識。當次回報進場標記清楚，固定點扁帶已更換。'), update('2026-01-30', 'Sarah-Jane Petts', 'The traverse was reported as roughly 35–40 m rather than the 20 m shown on the topo; two 60 m ropes were recommended.', '橫渡段回報長度約 35–40m，而非 topo 標示的 20m；建議攜帶兩條 60m 繩。')], videos: [],
  },
  'Major Mayhem Canyon': {
    source_url: 'https://www.kiwicanyons.org/major-mayhem-canyon-v5a3iv/', topo_url: PDF.mayhem, topo_page: 4,
    gps: '-44.6550407, 168.3562927', elevation: 887,
    approach_time: '1–4 hrs', descent_time: '4–10 hrs', return_time: '10–15 min', total_time: '5–14 hrs',
    details: { map_sheet: 'CA10', rock: 'Schist', rock_zh: '片岩', water: 'Medium to low', water_zh: '中低水量', catchment: '2.2 km²', anchors: 'Mostly bolted with occasional natural anchors', anchors_zh: '以螺栓為主，少數天然確保點', flood: 'Serious; logjams create false floors', flood_zh: '嚴重；漂木堵塞形成假底' },
    approach_steps: [step('Choose the full upper entry near 1400 m or the lower entry near the 800 m contour.', '選擇約 1400 m 的全段入口，或約 800 m 等高線的下段入口。'), step('The lower canyon exits near the Happy Place around 600 m.', '下段約在 600 m 的 Happy Place 附近出溪。')],
    route_sections: [
      section('Upper and lower', '全段', '11–14 hrs', '', { approach_time: '3–4 hrs', descent_time: '8–10 hrs', return_time: '10–15 min' }),
      section('Lower only', '只走下段', '5–7.5 hrs', '', { approach_time: '1–1.5 hrs', descent_time: '4–6 hrs', return_time: '10–15 min' }),
    ],
    topo_pages: [page(1, '/topos/nz/major-mayhem-map.jpg', 'Approach map', '進場地圖'), page(3, '/topos/nz/major-mayhem-3.jpg', 'Topo 1', '路線圖 1'), page(4, '/topos/nz/major-mayhem-4.jpg', 'Topo 2', '路線圖 2'), page(5, '/topos/nz/major-mayhem-5.jpg', 'Topo 3', '路線圖 3')],
    recent_updates: [update('2026-03-16', 'Joe Cruikshank', 'The lower route from the 800 m entry was descended; anchors were in good condition and several nuts were tightened.', '當次由 800m 下段入口進入；固定點狀況良好，並鎖緊數個螺帽。'), update('2025-03-29', 'Matt', 'The lower canyon still contained considerable timber and false floors. Minor anchor repairs were completed and one protected bolt was added.', '下段仍有大量漂木與假底；當次完成少量固定點維修，並在較受保護的位置新增一顆螺栓。')], videos: [],
  },
  'Alf Creek': {
    source_url: 'https://www.kiwicanyons.org/alf-creek-fox-glacier/', topo_url: '', topo_page: 0,
    gps: '-43.5059814, 170.1114502', elevation: 1423, photos: ['/photos/nz/alf-creek.jpg'],
    first_descent: 'Jeroen Verhees et al., 2025/26 season',
    details: { map_sheet: 'Fox Glacier', rock: 'Open alpine waterfalls', rock_zh: '開闊高山瀑布', water: 'Not published', water_zh: '未公布', catchment: 'Not published', catchment_zh: '未公布', anchors: 'Not published', anchors_zh: '未公布', flood: 'Glacier-adjacent alpine hazards', flood_zh: '鄰近冰河的高山風險' },
    approach_steps: [step('Helicopter access is required.', '需要直升機進場。')], route_sections: [section('Waterfall sequence', '瀑布序列', '', 'A sequence over 100 m above Fox Glacier.')], topo_pages: [], recent_updates: [], videos: [],
  },
  'Whirling Water': {
    source_url: 'https://www.kiwicanyons.org/whirlingwater/', topo_url: PDF.waitaha, topo_page: 16,
    gps: '-43.1510353, 170.7621765', elevation: 576,
    approach_time: '1–4 hrs from Kiwi Flat Hut', descent_time: '2.5–13 hrs', return_time: '30 min', total_time: '4–19.5 hrs by section',
    details: { map_sheet: 'Waitaha Valley', rock: 'Bomber schist', rock_zh: '極堅硬片岩', water: 'Very high flow with deep pools', water_zh: '極高水量與深潭', catchment: '7 / 11 / 17 km² by section', catchment_zh: '上／中／下段分別 7／11／17 km²', anchors: 'Upper: single/removable; middle/lower: double bolts and V-threads', anchors_zh: '上段：單點／可拆螺栓；中下段：雙螺栓與 V-thread', flood: 'Extreme', flood_zh: '極高' },
    approach_steps: [step('Use the legal true-right river margin to reach Kiwi Flat Hut.', '沿河流真右岸合法邊際抵達 Kiwi Flat Hut。'), step('Check flow at -43.14024, 170.75484 before committing.', '在 -43.14024, 170.75484 檢查水量後再決定是否進入。'), step('Choose the lower confluence, middle or upper entry shown on the official map.', '依官方地圖選擇下段匯流口、中段或上段入口。')],
    route_sections: [
      section('Lower only', '只走下段', '4–6 hrs', '', { approach_time: '1–1.5 hrs', descent_time: '2.5–4 hrs', return_time: '30 min' }),
      section('Middle + lower', '中段＋下段', '9–14 hrs', '', { approach_time: '2–3.5 hrs', descent_time: '6.5–10 hrs', return_time: '30 min' }),
      section('Full canyon', '全段', '12–19.5 hrs', '', { approach_time: '3.5–6 hrs', descent_time: '8–13 hrs', return_time: '30 min' }),
    ],
    topo_pages: [page(15, '/topos/nz/whirling-15.jpg', 'Approach map', '進場地圖'), page(16, '/topos/nz/whirling-16.jpg', 'Upper', '上段'), page(17, '/topos/nz/whirling-17.jpg', 'Middle 1', '中段 1'), page(18, '/topos/nz/whirling-18.jpg', 'Middle 2', '中段 2'), page(19, '/topos/nz/whirling-19.jpg', 'Lower', '下段')],
    recent_updates: [update('2025-04-01', 'Edgar Fella', 'A full descent was completed over two days. The canyon was very slippery; the party recommended carrying a brush and allowing for limited anchors.', '全段以兩天完成。溪床非常濕滑；回報者建議攜帶刷具，並預期部分位置固定點較少。'), update('2025-03-29', 'Matt', 'The walk to Kiwi Flat and the untracked approach both required substantial time and careful navigation. A strong team familiar with high-volume canyoning was recommended.', '前往 Kiwi Flat 與無路徑進場都需要充足時間及仔細導航；建議由熟悉大水量溪谷的強隊執行。')],
    videos: [video("New Zealand's Most EPIC Canyon - Whirling Water V6.A6.V", 'https://www.youtube.com/watch?v=jIfyj-Ydxvs', 'YouTube')],
  },
  'The General': {
    source_url: 'https://www.kiwicanyons.org/thegeneral/', topo_url: PDF.general, topo_page: 5,
    gps: '-44.6421928, 168.3560791', elevation: 891,
    gpx_url: '/gpx/nz/the-general-intermedio.gpx', gpx_track: JSON.stringify([generalTrack]),
    approach_time: '2–4 hrs', descent_time: '4–10 hrs', return_time: '1.5 hrs', total_time: '7.5–15.5 hrs by section',
    details: { map_sheet: 'CA10', rock: 'Compact schist', rock_zh: '緻密片岩', water: 'Medium normal flow', water_zh: '正常為中等水量', catchment: '3 km²', anchors: 'Double bolts, upgraded in 2026', anchors_zh: '雙螺栓確保點，2026 年更新', flood: 'Extreme; no escape from upper sections', flood_zh: '極高；上段無撤退路線' },
    approach_steps: [step('Choose Les Haut, Superiore, Intermedio or Inferiore entry from the Dart Valley approach.', '由 Dart Valley 進場，選擇 Les Haut、Superiore、Intermedio 或 Inferiore 入口。'), step('Use the downloadable Intermedio GPX for the middle entry.', '中段入口可使用官方 Intermedio GPX。')],
    route_sections: [
      section('Les Haut', '最高段', '15.5 hrs', '', { approach_time: '4 hrs', descent_time: '10 hrs', return_time: '1.5 hrs' }),
      section('Superiore', '上段', '12.5 hrs', '', { approach_time: '3 hrs', descent_time: '8 hrs', return_time: '1.5 hrs' }),
      section('Intermedio', '中段', '10.5 hrs', '', { approach_time: '2.5 hrs', descent_time: '7 hrs', return_time: '1.5 hrs' }),
      section('Inferiore', '下段', '7.5 hrs', '', { approach_time: '2 hrs', descent_time: '4 hrs', return_time: '1.5 hrs' }),
    ],
    topo_pages: [page(7, '/topos/nz/the-general-7.jpg', 'Approach map', '進場地圖'), page(4, '/topos/nz/the-general-4.jpg', 'Topo 1', '路線圖 1'), page(5, '/topos/nz/the-general-5.jpg', 'Topo 2', '路線圖 2')],
    recent_updates: [update('2026-04-22', 'Joe Cruikshank', 'The upper 15 pitches contained snow and ice. The upper route was re-equipped so each pitch had two stainless ring bolts at the time of the report.', '上段前 15 個落差有冰雪；當次回報已重新整備，上段每個落差皆有兩顆不鏽鋼環形螺栓。'), update('2026-04-13', 'Oscar', 'At the Intermedio entry, the anchor is about 45 m above the canyon floor. The R23 deviation bolt was missing, while the other anchors from Intermedio were reported in good condition.', 'Intermedio 入口固定點約在溪床上方 45m；R23 導向螺栓缺失，其餘 Intermedio 以下固定點當次狀況良好。')],
    videos: [video('General Canyoning', 'https://vimeo.com/217713076', 'Vimeo')],
  },
  'Robinson Creek': {
    source_url: 'https://www.kiwicanyons.org/robinson-creek-v4a3i/', topo_url: PDF.robinson, topo_page: 2,
    grading: 'v4 a3 II ★★★', max_drop: '25m', first_descent: '2004 Alain Rohr & Ondrej Havlicek',
    region: '紐西蘭 Haast Pass', region_en: 'New Zealand · Haast Pass',
    location: 'SH6 north of Haast Pass, Mount Aspiring National Park', location_zh: '阿斯派靈山國家公園，Haast Pass 北側 SH6',
    subtitle: 'Short canyon ending in a giant cavern', subtitle_zh: '短程峽谷，下段深入巨大洞穴',
    character: 'Open upper canyon with pools, jumps and swims; deep lower cavern', character_zh: '上段開闊，有水潭、跳水與游泳；下段深入洞穴',
    gps: '-44.081111, 169.373056', elevation: 494,
    approach_time: '15 min', descent_time: '1–2 hrs', return_time: '1 min', total_time: '2.5–3 hrs',
    gear: 'Minimum 1 × 50m rope', gear_zh: '至少 1 條 50m 繩',
    hazards: 'High flash-flood risk. Escape is difficult before R3 and impossible after it. Inspect unstable log jams and sieves one person at a time.', hazards_zh: '暴洪風險高；R3 前僅能勉強撤退，之後無法撤退。漂木堵塞與篩孔須逐一確認並單人通過。',
    photos: [
      'https://www.kiwicanyons.org/wp-content/uploads/2011/12/Robinsons-Ck-three-007-768x1024.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2011/12/Robinsons-Ck-three-011-1024x768.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2011/12/Robinsons-Ck-three-015-768x1024.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2011/12/Robinsons-Ck-three-029-1024x768.jpg',
    ],
    details: { map_sheet: 'BZ13 Haast Pass', rock: 'Solid schist', rock_zh: '堅硬片岩', water: 'Low to medium flow; very cold pools with jumps and swims', water_zh: '低至中等水量；水潭非常冰冷，包含跳水與游泳', catchment: '3.5 km²', catchment_zh: '3.5 km²', anchors: 'Double-bolt stations; most upgraded with stainless chain and maillons in 2024/25', anchors_zh: '雙螺栓確保站；多數於 2024/25 升級為不鏽鋼鏈條與梅隆鎖', flood: 'High; inescapable narrows after R3', flood_zh: '高；R3 後為無法撤退的窄峽' },
    approach_steps: [
      step('Drive 3.1 km north from Haast Pass summit and park in the gravel area just north of the Robinson Creek bridge.', '由 Haast Pass 最高點沿 SH6 向北行駛 3.1km，停在 Robinson Creek 橋北側碎石空地。'),
      step('Follow the formed trail from the true-left bank; it climbs steeply to the canyon start in about 15 minutes.', '由溪流真左岸沿明顯小徑陡升，約 15 分鐘抵達入溪點。'),
    ],
    route_sections: [section('Main canyon', '主峽谷', '1–2 hrs', 'R1–R8 with the highlight being a 25 m abseil into a giant cavern. Unstable log jam below the cavern creates a sieve hazard — inspect before committing.')],
    topo_pages: [page(1, '/topos/nz/robinson-1.jpg', 'Approach map', '進場地圖'), page(2, '/topos/nz/robinson-2.jpg')],
    recent_updates: [
      update('2026-01-06', 'Dan Davis', 'A short, fun Haast Pass canyon. Log jam after R6 seems unstable — treat with caution.', '簡短而有趣的 Haast Pass 峽谷；R6 後漂木堆積不穩定，需謹慎通過。'),
      update('2025-11-14', 'Dan Clearwater', 'Anchor repairs completed. Unstable log jam below the cavern creates a sieve hazard. Treat all log jams with caution.', '完成固定點維修。cavern 下方漂木堆積不穩定，形成篩孔危險，所有漂木堆均需謹慎對待。'),
    ],
    videos: [],
  },
  'Falls Creek (Hollyford)': {
    source_url: 'https://www.kiwicanyons.org/falls-creek-hollyford/', topo_url: PDF.falls_hollyford, topo_page: 2,
    grading: 'v5 a5 IV ★★★★', max_drop: '80m', first_descent: '2007 Dave Vass, Tristran & Alain Rohr',
    region: '紐西蘭 Fiordland', region_en: 'New Zealand · Fiordland',
    location: 'Falls Creek, Hollyford Valley, Fiordland National Park', location_zh: '峽灣國家公園 Hollyford Valley，Falls Creek',
    subtitle: 'High-volume slot canyon with an 80m entrance pitch', subtitle_zh: '大水量槽型峽谷，入口為 80m 多段垂降',
    character: 'Enclosed high-volume slot with powerful spray, deep pools and the Black Hole', character_zh: '封閉的大水量槽型峽谷，包含強烈水霧、深潭與 Black Hole',
    gps: '-44.82601733, 168.07800368', elevation: 700,
    approach_time: '1.5 hrs', descent_time: '2–4 hrs', return_time: '15 min', total_time: '4–6 hrs',
    gear: 'Minimum 2 × 60m ropes; carry a drill, bolt kit, replacement webbing and goggles', gear_zh: '至少 2 條 60m 繩；攜帶電鑽、螺栓組、替換扁帶與護目鏡',
    hazards: 'High flash-flood risk and no verified escapes. Strong hydraulics, swell, undercuts and pour-over crossings become serious above average flow.', hazards_zh: '暴洪風險高且無已確認撤退路線。高於平均水量時，強勁回流、湧浪、掏蝕與越流橫渡都會顯著增加危險。',
    photos: [
      'https://www.kiwicanyons.org/wp-content/uploads/2011/06/Falls-Creek-from-Martin-Wilson-1-768x1024.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2011/06/Falls-Creek-from-Martin-Wilson-2-768x1024.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2011/06/Falls-Creek-Jeff-Delholme-2-700x467.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2011/06/Falls-Creek-Jeff-Delholme-5-700x467.jpg',
    ],
    details: { map_sheet: 'Hollyford / Fiordland', rock: 'Granite', rock_zh: '花崗岩', water: 'High flow; small level changes greatly increase hazards', water_zh: '高水量；水位小幅變化就會大幅增加危險', catchment: 'Not published', catchment_zh: '未公布', anchors: 'Double-bolt anchors with some single bolts; floods can remove anchors', anchors_zh: '雙螺栓為主，部分為單螺栓；洪水可能沖毀固定點', flood: 'High; no verified escapes', flood_zh: '高；無已確認撤退路線' },
    approach_steps: [
      step('Drive to the Hollyford Valley road and follow the marked approach for 1–1.5 hours to the canyon entry.', '驅車至 Hollyford Valley 路口，沿標記路線約 1–1.5 小時抵達入溪點。'),
      step('Inspect flow at the entry — first trips are recommended at low water; medium levels are manageable with careful route selection.', '在入口確認水量；建議初次低水位進入，中等水位需謹慎選線。'),
    ],
    route_sections: [section('Main canyon', '主峽谷', '2–4 hrs', 'Entrance pitch drops 80 m (25 m + 55 m with rebelay) into a cauldron. A dark "black hole" section mid-canyon. Undercut hazards in the main flow at high water.')],
    topo_pages: [page(1, '/topos/nz/falls-hollyford-1.jpg', 'Approach map and water guide', '進場地圖與水量參考'), page(2, '/topos/nz/falls-hollyford-2.jpg')],
    recent_updates: [
      update('2026-02-09', 'Zen M', 'A classic worth planning a trip to NZ around. Strong swimmers required at high water level.', '值得為此專程飛往紐西蘭的經典路線；高水位需要強健泳者。'),
      update('2026-01-31', 'Jaap Sikkema', 'Normal flow, all in good condition; webbing on double anchors needs replacement.', '正常水量，整體狀況良好；雙錨點扁帶需更換。'),
      update('2026-01-06', 'Patrick Timm', 'R5 floor has lowered — now an 8–10 m abseil; R6 has been removed. New access bolts and ring hangers added.', 'R5 底部下陷，現為 8–10m 垂降；R6 已移除。新增進場螺栓與環形吊片。'),
    ],
    videos: [
      video('Falls Creek Canyon — first abseil', 'https://www.youtube.com/watch?v=5JxAc-szFRw', 'YouTube'),
      video('The Black Hole — Falls Creek Canyon', 'https://www.youtube.com/watch?v=FZqcUXXsabE', 'YouTube'),
      video('Blue Pool Falls — Falls Creek Canyon', 'https://www.youtube.com/watch?v=5XPZ6bFVD_Y', 'YouTube'),
    ],
  },
  'Dickson River': {
    source_url: 'https://www.kiwicanyons.org/dickson-river/', topo_url: PDF.dickson, topo_page: 1,
    grading: 'v3 a4 IV ★★★', max_drop: '', first_descent: 'First full descent: Keith Riley, Zak Shaw & Zack Stone, April 2022',
    region: '紐西蘭 Mikonui Valley', region_en: 'New Zealand · Mikonui Valley, Westland',
    location: 'Mikonui Valley, Westland', location_zh: '西部地區 Mikonui Valley',
    subtitle: 'Relentless bedrock slot with jumps and unlikely-looking problems', subtitle_zh: '連續不間斷的基岩窄峽，包含跳水與多個特殊地形',
    character: 'Very committing, continuous bedrock canyon with few rope pitches', character_zh: '高承諾度、連續的基岩峽谷，主要以跳水、攀爬與滑瀑推進',
    gps: '-43.0300598, 170.9108734', elevation: 351,
    approach_time: '5 hrs', descent_time: '4 hrs 30 min', return_time: '1 hr', total_time: '11 hrs',
    gear: '1 × 60m rope; carry anchor repair material', gear_zh: '1 條 60m 繩；攜帶固定點維修材料',
    hazards: 'Enter only with a good forecast. Escapes are occasional, difficult and require a steep bush climb back to the Mikonui Spur track.', hazards_zh: '只在穩定好天氣進入。撤退點少且困難，需陡上灌木林返回 Mikonui Spur 步道。',
    details: { map_sheet: 'Mikonui Valley', rock: 'Bedrock schist', rock_zh: '基岩片岩', water: 'Low flow is best; medium flow may be manageable by a strong team', water_zh: '低水量最佳；強隊可能可在中等水量通行', catchment: 'Alpine; snowmelt until mid-summer', catchment_zh: '高山集水區；融雪可持續至盛夏', anchors: '3 bolted anchors, 1 tree and 2 bollards', anchors_zh: '3 組螺栓、1 個樹木及 2 個岩角確保點', flood: 'High; good forecast required', flood_zh: '高；必須確認穩定天氣' },
    approach_steps: [
      step('From Totara Valley Road, follow the Mikonui River route to Dickson Stream and the marked Mikonui Spur Biv track.', '由 Totara Valley Road 沿 Mikonui River 前進至 Dickson Stream，再接 Mikonui Spur Biv 標示路線。'),
      step('Near the 1116 m high point, leave the track before the gully and follow the broad spur southwest, keeping left of the slip.', '接近 1116m 高點時，在溪溝前離開步道，沿寬稜向西南，保持在崩塌地左側。'),
      step('Descend the second slip, then traverse left through bush to the broad ridge toward lower Grimmond Creek.', '由第二處崩塌地下降，再向左橫越林地，接往 lower Grimmond Creek 的寬稜。'),
    ],
    route_sections: [section('Main canyon', '主峽谷', '4 hrs 30 min', 'Continuous bedrock slot with mostly jumps, scrambles and slides; rope is needed only occasionally.')],
    topo_pages: [page(1, '/topos/nz/dickson-map.jpg', 'Approach map', '進場地圖'), page(1, '/topos/nz/dickson-aerial.jpg', 'Aerial approach', '空照進場路線')],
    photos: [
      'https://www.kiwicanyons.org/wp-content/uploads/2022/05/Dickson-River-Keith-Riley-1-1.jpeg',
      'https://www.kiwicanyons.org/wp-content/uploads/2022/05/Dickson-River-Keith-Riley-4.jpeg',
      'https://www.kiwicanyons.org/wp-content/uploads/2022/05/Dickson-River-Keith-Riley-2-1.jpeg',
      'https://www.kiwicanyons.org/wp-content/uploads/2022/05/Dickson-River-Keith-Riley-5.jpeg',
    ],
    recent_updates: [], videos: [],
  },
  'Edwards River': {
    source_url: 'https://www.kiwicanyons.org/edwards-river-gorge/', topo_url: '', topo_page: 0,
    grading: 'v3 a4 IV ★★★', max_drop: '45m', first_descent: 'First kayak descent: October 2012; equipped for canyoning by Tom Johns & John Harris, February 2020',
    region: '紐西蘭 Arthur’s Pass', region_en: 'New Zealand · Arthur’s Pass, Canterbury',
    location: 'Edwards River, Arthur’s Pass National Park', location_zh: 'Arthur’s Pass 國家公園 Edwards River',
    subtitle: 'Cold river gorge with long swims, jumps and boulder problems', subtitle_zh: '低溫河川峽谷，包含長距離游泳、跳水與巨石地形',
    character: 'A high-flow river canyon with 8–9 pitches and mandatory swims', character_zh: '大水量河川峽谷，約 8–9 個落差並有強制游泳段',
    gps: '-42.9611969, 171.6394043', elevation: 878,
    approach_time: '2 hrs 15 min', descent_time: '6–7 hrs', return_time: '1 hr 15 min', total_time: '9.5–10.5 hrs',
    gear: 'Thick 5mm wetsuit, warm layers and an extra sling; R6/7 is 45m combined or R6 is 30m', gear_zh: '厚 5mm 防寒衣、保暖層與額外扁帶；R6／R7 合併為 45m，單走 R6 為 30m',
    hazards: 'Major pools were gravel-filled after the March 2026 floods. Check every jump. Strong swimmers are required; hydraulic features and the R2 siphon sequence demand careful movement.', hazards_zh: '2026 年 3 月洪水後主要水潭被礫石填高，所有跳水都須重新確認。需要強健泳者，水流地形與 R2 虹吸段必須謹慎通過。',
    details: { map_sheet: "Arthur's Pass / Waimakariri", rock: 'Not published', rock_zh: '未公布', water: 'River canyon; descend only at low flow. Reference gauge: Waimak Below Otarama under 50 cumecs (ECAN).', water_zh: '河川型峽谷；只適合低水量進入。參考水位站：ECAN 的 Waimak Below Otarama 低於 50 m³/s。', catchment: 'Not published', catchment_zh: '未公布', anchors: 'All rappel bolt anchors are double bolted; white Dyneema cord upgraded February 2025', anchors_zh: '所有垂降螺栓站皆為雙點；白色 Dyneema 繩環於 2025 年 2 月升級', flood: 'High; river flow changes the hazards', flood_zh: '高；河川流量會直接改變風險' },
    approach_steps: [step('Follow the Edwards Hut Track until the top of the gorge and Edwards Hut are visible.', '沿 Edwards Hut Track 前進，直到可看見峽谷頂端與 Edwards Hut。')],
    route_sections: [section('River gorge', '河川峽谷', '6–7 hrs', 'Eight to nine pitches with bouldering, downclimbs, jumps and mandatory swims. Multiple true-left escapes exist but are long and steep.')],
    topo_pages: [page(1, 'https://www.kiwicanyons.org/wp-content/uploads/2020/04/Edwards-Jan-2026-724x1024.jpg')],
    photos: [
      'https://www.kiwicanyons.org/wp-content/uploads/2020/04/Edwards-River-Canyon-John-Harris-1.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2020/04/Edwards-River-Canyon-John-Harris-2.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2020/04/Edwards-River-Canyon-John-Harris-3.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2020/04/Edwards-River-Canyon-John-Harris-4.jpg',
    ],
    recent_updates: [
      update('2026-03-21', 'Nola Collie', 'Recent floods filled major pools with gravel, reducing the number of jumps. White Dyneema anchors were in good condition; normal flow, four people, 2.75 / 4 / 2.25 hours.', '近期洪水以礫石填高主要水潭，可跳地形減少。白色 Dyneema 固定點狀況良好；正常水量，4 人，進場／下降／回程為 2.75／4／2.25 小時。'),
      update('2026-03-07', 'Will Talbot', 'Anchors were usable and older white anchor cord was backed up with blue cord. Several jumps no longer went; three people took 2.75 / 5.5 / 1.5 hours.', '固定點可用，較舊的白色繩環另以藍繩補強。數個跳水已不可行；3 人耗時 2.75／5.5／1.5 小時。'),
      update('2025-02-15', 'Nola Collie', 'One year since re-bolting; all anchors in great condition. Lots of good jumps. Some gravel had moved on the last major pool. Water temperature was cold despite a hot day — wear layers. Four people, 2.75 / 5 / 1.5 hours.', '重新打螺栓後一年，固定點狀況極佳。跳水地形豐富。最大水潭底部有礫石移動。炎熱天氣下水溫仍冷，建議穿保暖層。4 人，耗時 2.75／5／1.5 小時。'),
      update('2024-01-13', 'Nola Collie', 'Anchor upgrade completed this trip (took longer than usual). Beautiful blue deep pools, good flow, cold water. Quick walk out on track. Four people, 2.75 / 8 / 1.5 hours.', '本次完成固定點升級作業（耗時較長）。水潭深藍漂亮，水量正常但水溫冷。步道回程快速。4 人，耗時 2.75／8／1.5 小時。'),
    ],
    videos: [video('First descent of the Edwards River', 'https://www.youtube.com/watch?v=kiVmk703KHU', 'YouTube')],
  },
  'Barrack Creek': {
    source_url: 'https://www.kiwicanyons.org/barrack-creek-v5a4iv/', topo_url: 'https://app.box.com/s/g2dsbavcrdpz026zxq2vlt1flscx0im0', topo_page: 2,
    grading: 'v5 a4 IV ★★★', max_drop: '65m', first_descent: 'Chris Harrington & Justin Venable, March 2015',
    region: '紐西蘭 Otira Valley', region_en: 'New Zealand · Otira Valley, Westland',
    location: 'Barrack Creek, Otira Valley', location_zh: '西部地區 Otira Valley，Barrack Creek',
    subtitle: 'Steep aquatic alpine canyon with a dramatic final rappel series', subtitle_zh: '陡峭的大水量高山峽谷，末段為連續大型垂降',
    character: 'Polished greywacke, blue pools and 19 pitches across four sections', character_zh: '光滑雜砂岩、藍色水潭，共 19 個落差、分為四段',
    gps: '-42.8472748, 171.5904846', elevation: 1061,
    gpx_url: '/gpx/nz/barrack-walk-in.gpx', gpx_track: JSON.stringify([barrackTrack]),
    approach_time: '3 hrs', descent_time: '8 hrs', return_time: '30 min', total_time: '11 hrs 30 min',
    gear: '2 × 70m ropes; carry substantial replacement webbing and rappel rings', gear_zh: '2 條 70m 繩；攜帶充足替換扁帶與垂降環',
    hazards: 'Remote and committing after the first middle-section pitch. Anchors range from double bolts to single or natural anchors and may be missing after floods.', hazards_zh: '位置偏遠；拉掉中段第一個落差的繩後即無法撤退。固定點包含雙螺栓、單螺栓與天然點，洪水後可能缺失。',
    details: { map_sheet: 'BV20 Otira', rock: 'Greywacke', rock_zh: '雜砂岩', water: 'Moderate normal flow; top section about a3 and middle about a4', water_zh: '正常為中等水量；上段約 a3、中段約 a4', catchment: '4 km²', catchment_zh: '4 km²', anchors: 'Bolted and natural anchors', anchors_zh: '螺栓與天然確保點', flood: 'Moderate', flood_zh: '中等' },
    approach_steps: [
      step('Park on SH73 before the Rolleston River Bridge, about 3 km before Otira.', '在 Otira 前約 3km、Rolleston River Bridge 前的 SH73 彎道旁停車。'),
      step('Follow the 4WD track to Barrack Creek, walk 500 m upstream, then climb the marked true-right route above the bush line.', '沿四驅車道到 Barrack Creek，上溯 500m，再走真右岸標記路線爬升至林線上方。'),
      step('Around 1340 m, sidle across the boulder field and descend open tussock slopes to the entry near 1200 m.', '約 1340m 處橫越巨石坡，再沿開闊草坡下降至約 1200m 的入口。'),
    ],
    route_sections: [
      section('Entry section', '入口段', '30 min', 'R1–R4, followed by about 30 minutes to the top section.'),
      section('Top section', '上段', '', 'Nine pitches including open rappels, jumps, downclimbs and a narrowing sequence.'),
      section('Middle section', '中段', '', 'Six smaller pitches; the final three contain water features.'),
      section('Lower section', '下段', '', 'R16–R19 form the final amphitheatre; R19 starts in a cave-like feature.'),
    ],
    topo_pages: [page(1, '/topos/nz/barrack-map.jpg', 'Approach map', '進場地圖'), page(2, '/topos/nz/barrack-topo.jpg')],
    photos: [
      'https://www.kiwicanyons.org/wp-content/uploads/2019/05/Barrack-Creek-Nola-Collie-2.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2019/05/Barrack-Creek-Nola-Collie-10.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2019/05/Barrack-Creek-Nola-Collie-18.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2019/05/Barrack-Creek-Nola-Collie-22.jpg',
    ],
    recent_updates: [
      update('2025-03-22', 'Ben Ellis', 'Flow was lower than normal and anchors were good; one odd webbing section was replaced. Three people took 2.5 / 5.5 / 0.5 hours.', '水量低於正常值，固定點狀況良好，並替換一處異常扁帶。3 人耗時 2.5／5.5／0.5 小時。'),
      update('2023-02-18', 'Grant Prattley', 'The route was updated to 19 pitches and a revised topo. Several pools had deepened; anchor repairs were completed.', '路線更新為 19 個落差並修訂 topo；數個水潭變深，當次亦完成固定點維修。'),
    ],
    videos: [video('Barrack Creek canyoning', 'https://www.youtube.com/watch?v=UoQuseaKzr8', 'YouTube')],
  },
  'Wesley Creek': {
    source_url: 'https://www.kiwicanyons.org/wesley-creek/', topo_url: '', topo_page: 0,
    grading: 'v5 a3 IV ★★★', max_drop: '124m', first_descent: 'Ashley Stewart, Tom Johns, John Harris & Tom Guy, March 2019',
    region: '紐西蘭 Otira Valley', region_en: 'New Zealand · Otira Valley, Westland',
    location: 'Wesley Creek, Otira Valley', location_zh: '西部地區 Otira Valley，Wesley Creek',
    subtitle: 'Long alpine canyon with a 124m three-pitch waterfall', subtitle_zh: '長程高山峽谷，核心地形為 124m 三段式瀑布',
    character: 'About 13 pitches divided into four widely spaced sections', character_zh: '約 13 個落差，分為四個間隔較遠的區段',
    gps: '-42.8740158, 171.5677338', elevation: 1092,
    approach_time: '5 hrs', descent_time: '5 hrs', return_time: 'Included in descent', total_time: '10 hrs',
    gear: '2 × 70m ropes; natural-anchor rigging material', gear_zh: '2 條 70m 繩；天然固定點架設材料',
    hazards: 'Fully committed after Section 2 until below the 124m waterfall. Hanging rebelays and rockfall exposure require experienced multipitch rigging. Anyone at the base of the 124m waterfall must stand well back — rockfall dislodged by those still rappelling above is a serious hazard.', hazards_zh: '進入第二段後至 124m 瀑布下方無法撤退。懸空轉站與落石風險需要熟練的多段垂降技術。在 124m 瀑布底部等待者須退至遠處——上方隊員繩降時落石風險極高。',
    details: { map_sheet: 'Otira Valley', rock: 'Not published', rock_zh: '未公布', water: 'Alpine canyon; published grade a3', water_zh: '高山峽谷；公布水量難度為 a3', catchment: 'Not published', catchment_zh: '未公布', anchors: 'Bolts and natural anchors', anchors_zh: '螺栓與天然確保點', flood: 'High commitment from Section 2 through Section 3', flood_zh: '高；第二至第三段為高承諾區' },
    approach_steps: [step('Use the published Otira Valley approach to reach Section 1 near the mapped 56 m waterfall.', '沿公布的 Otira Valley 進場路線，抵達地圖標示 56m 瀑布附近的第一段入口。')],
    route_sections: [
      section('Section 1', '第一段', '', 'Two short downclimbs and four nearly continuous 10–30 m waterfalls.'),
      section('Section 2', '第二段', '', 'About 500 m downstream: one 40 m pitch over two waterfalls; commitment begins below it.'),
      section('Section 3', '第三段', '', 'Another 500 m downstream: the 124 m waterfall is split into R7, R8 and R9 with hanging rebelays.'),
      section('Section 4', '第四段', '', 'Four pitches from 7–30 m, then roughly 1 km downstream to the road bridge.'),
    ],
    topo_pages: [page(1, '/topos/nz/wesley-map.jpg', 'Approach map', '進場地圖'), page(2, '/topos/nz/wesley-topo.jpg')],
    photos: [
      'https://www.kiwicanyons.org/wp-content/uploads/2020/04/Wesley-Canyon-Ashley-Stewart-1.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2020/04/Wesley-Canyon-Ashley-Stewart-3.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2020/04/Wesley-Canyon-Ashley-Stewart-6.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2020/04/Wesley-Canyon-Ashley-Stewart-11-1.jpg',
    ],
    recent_updates: [], videos: [],
  },
  'Twin Creek': {
    source_url: 'https://www.kiwicanyons.org/twincreekv5a2iii/', topo_url: 'https://app.box.com/s/h4mophrv4merrf20wytnmcnverxqaqps', topo_page: 2,
    grading: 'v5 a2 III ★★★', max_drop: '70m', first_descent: 'Top: Grant Prattley, James Abbott & Nola Collie, 2017; middle: descended commercially before 2000 (first descent unknown); lower: Grant Prattley, James Abbott & Nola Collie, 2016',
    region: '紐西蘭 Arthur’s Pass', region_en: 'New Zealand · Arthur’s Pass, Canterbury',
    location: 'Temple Basin, Arthur’s Pass National Park', location_zh: 'Arthur’s Pass 國家公園 Temple Basin',
    subtitle: 'Three-section alpine canyon with views across to Mt Rolleston', subtitle_zh: '三段式高山峽谷，可眺望 Mt Rolleston',
    character: 'Friendly top and middle sections followed by a steep, committing lower canyon', character_zh: '上中段較開闊易撤退，下段陡峭且高度封閉',
    gps: '-42.9105835, 171.5720978', elevation: 1272,
    approach_time: '1 hr', descent_time: '3 hrs 30 min–5 hrs 30 min', return_time: '1–30 min', total_time: '5–6 hrs 31 min',
    gear: 'Top + middle: 2 × 50m. Full descent: 2 × 70m, or 2 × 60m with the harder R13 rebelay; an extra 25m rope is recommended for R12.', gear_zh: '上＋中段：2 條 50m。全段：2 條 70m；或以 2 條 60m 使用較困難的 R13 轉站。R12 建議額外攜帶 25m 繩。',
    hazards: 'The lower canyon has no escape for its first 115 vertical metres. R13 is exposed and has a sharp rope edge; the 70m single-pitch method is strongly recommended.', hazards_zh: '下段前 115m 垂直落差無法撤退。R13 曝露且有銳利繩緣，官方強烈建議以 70m 單段方式下降。',
    details: { map_sheet: 'BV20 Otira', rock: 'Greywacke', rock_zh: '雜砂岩', water: 'Low normal flow; some top/middle rappels run directly in the water', water_zh: '正常為低水量；上中段部分垂降直接位於主水流', catchment: '2 km²', catchment_zh: '2 km²', anchors: 'Bolted anchors', anchors_zh: '螺栓確保點', flood: 'Low in upper sections; lower section is inescapable', flood_zh: '上段較低；下段無法撤退' },
    approach_steps: [
      step('Park at the Temple Basin track and ski-field car park north of Arthur’s Pass Village.', '停在 Arthur’s Pass Village 北側的 Temple Basin 步道／滑雪場停車場。'),
      step('Climb the Temple Basin track for about one hour to the bridge; R1 is a few metres downstream.', '沿 Temple Basin 步道上行約 1 小時至橋邊，R1 位於橋下游數公尺。'),
    ],
    route_sections: [
      section('Top + middle', '上段＋中段', '5 hrs', 'Eleven pitches with many escape options.', { approach_time: '1 hr', descent_time: '3 hrs 30 min', return_time: '30 min' }),
      section('Full descent', '全段', '6 hrs 31 min', 'Sixteen pitches with 2 × 70m ropes, including the committing lower section.', { approach_time: '1 hr', descent_time: '5 hrs 30 min', return_time: '1 min' }),
    ],
    topo_pages: [
      page(1, '/topos/nz/twin-map.jpg', 'Approach map', '進場地圖'),
      page(3, '/topos/nz/twin-topo.jpg', 'Top & Middle topo', '上段＋中段路線圖'),
      page(8, '/topos/nz/twin-lower.jpg', 'Lower Canyon topo', '下段路線圖'),
    ],
    photos: [
      'https://www.kiwicanyons.org/wp-content/uploads/2011/10/TwinCreek044.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2011/10/TwinCreek052.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2011/10/TwinCreek074.jpg',
      'https://www.kiwicanyons.org/wp-content/uploads/2016/04/Lower-Twin-Creek-8.jpg',
    ],
    recent_updates: [
      update('2026-04-24', 'Alistair', 'Recent snowfall; icicles and riming down to about 1200 m, but water wasn\'t too cold. R13 is spectacular in the afternoon sun. Views of fresh snow on Rolleston. Three people, 45 min / 4 hrs 45 min approach/descent.', '近期降雪，約 1200m 以上有冰柱與霧淞，但水溫尚可。下午陽光下 R13 極為壯觀，可見 Rolleston 雪景。3 人，進場 45 分鐘，下降 4 小時 45 分。'),
      update('2026-02-06', 'Zen M', 'Descended in miserable, cold weather and considered bailing, but glad we didn\'t — very pleasant canyon. Normal flow, anchors all in good condition. Eight people, 1 hr 20 min / 3 hrs 40 min / 1 min.', '天氣惡劣寒冷，一度考慮放棄，但最終很慶幸完成。峽谷非常值得。正常水量，固定點狀況全數良好。8 人，耗時 1:20／3:40／1 分鐘。'),
      update('2026-01-21', 'James', 'Full descent in clear conditions; water unusually cold. Major floods have moved lots of gravel down Twin Creek. R9 anchor station was missing a nut — repaired on the day. R14 single bolt (TR access) had been sheared off; the TL anchor was used to run a handline into the R14 TR bolts. Be prepared to repair anchors on any Arthur\'s Pass trip.', '全段下降，天氣晴朗，但水溫異常冷。洪水已移動大量礫石。R9 固定點少了一顆螺帽，當次修復。R14 進場單螺栓（TR 側）已斷裂，改以 TL 確保點架設輔助繩進入 R14 TR 螺栓。Arthur\'s Pass 所有路線出發前須預備修固定點。5 人。'),
      update('2025-11-25', 'Caleb', 'Ran all three sections from the very top. Core-shot a rope on the 67 m pitch — recommend bleeding the rope throughout each descent rather than only between rappels. Sunny day, normal flow, anchors all in good condition. Five people.', '由最頂端完成全三段。67m 垂降時損壞一條繩芯外露——建議在下降過程中持續移繩，而非只在各段之間移動。晴天，正常水量，固定點全數良好。5 人。'),
      update('2024-02-27', 'Chris', 'Top and middle sections one day, middle and lower the next. High flow on day one. R13: recommend being lowered to access R13a anchors then setting a handline. Used two 65 m ropes for the full R13 pitch — barely enough. Stop the last person at R13b to avoid a stuck rope when pulling. Rest of the canyon was great fun.', '第一天走上段與中段，第二天走中段與下段。第一天水量偏高。R13：建議以下放方式到達 R13a 確保點並架設輔助繩。以兩條 65m 繩完成 R13 全程，剛好夠用。最後一人在 R13b 停留以防撤繩時卡繩。其餘峽谷段十分有趣。2 人。'),
      update('2024-02-12', 'AdamB', 'Fun canyon. Very cold day with gusting wind; flow increased marginally by the end with heavy rain but not enough to cause problems. Did not check or attempt any jumps or slides. Four people.', '有趣的路線。天氣非常冷且風大，下午大雨後水量略增，但尚在可控範圍。未確認或嘗試跳水與滑瀑。4 人。'),
    ], videos: [],
  },
}

const pb = new PocketBase(process.env.VITE_PB_URL || 'https://raych-pocketbase.fly.dev')
await pb.collection('_superusers').authWithPassword(email, password)

const collection = await pb.collections.getOne('nz_routes')
const fields = [...collection.fields]
const fieldCount = fields.length
for (const name of ['details', 'approach_steps', 'route_sections', 'topo_pages', 'recent_updates', 'videos']) {
  if (!fields.some(field => field.name === name)) fields.push({ name, type: 'json', required: false, hidden: false, presentable: false, maxSize: 2_000_000 })
}
if (!fields.some(field => field.name === 'return_time')) fields.push({ name: 'return_time', type: 'text', required: false, hidden: false, presentable: false, max: 0, min: 0, pattern: '' })
if (!fields.some(field => field.name === 'gpx_url')) fields.push({ name: 'gpx_url', type: 'text', required: false, hidden: false, presentable: false, max: 0, min: 0, pattern: '' })
if (!fields.some(field => field.name === 'gpx_track')) fields.push({ name: 'gpx_track', type: 'text', required: false, hidden: false, presentable: false, max: 500000, min: 0, pattern: '' })
if (!fields.some(field => field.name === 'elevation')) fields.push({ name: 'elevation', type: 'number', required: false, hidden: false, presentable: false, min: null, max: null, onlyInt: true, noDecimal: true })
if (fields.length !== fieldCount) await pb.collections.update(collection.id, { fields })

const records = await pb.collection('nz_routes').getFullList({ fields: 'id,name' })
const byName = Object.fromEntries(records.map(r => [r.name, r.id]))

// Fail fast if a DB record has no matching ROUTES entry
for (const r of records) {
  if (!ROUTES[r.name]) throw new Error(`No topo data for DB record: ${r.name}`)
}

const requestedNames = process.argv.slice(2)
for (const name of requestedNames) if (!ROUTES[name]) throw new Error(`Unknown route: ${name}`)

// Upsert: update existing, create new
const routesToSync = requestedNames.length ? requestedNames.map(name => [name, ROUTES[name]]) : Object.entries(ROUTES)
for (const [name, patch] of routesToSync) {
  if (byName[name]) {
    await pb.collection('nz_routes').update(byName[name], { name, ...patch })
    console.log(`updated  ${name}`)
  } else {
    await pb.collection('nz_routes').create({ name, ...patch })
    console.log(`created  ${name}`)
  }
}

if (!requestedNames.length) {
  const finalCount = (await pb.collection('nz_routes').getFullList({ fields: 'id' })).length
  if (finalCount !== Object.keys(ROUTES).length) throw new Error(`Expected ${Object.keys(ROUTES).length} database records, found ${finalCount}`)
}
console.log('NZ topo sync complete')
