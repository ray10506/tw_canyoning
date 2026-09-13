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
}

const page = (page, asset, en = 'Topo', zh = '路線圖') => ({ page, asset, en, zh })
const step = (en, zh) => ({ en, zh })
const section = (name, zh, time, detail = '', timing = {}) => ({ name, zh, time, detail, ...timing })
const update = (date, author, en, zh) => ({ date, author, en, zh })
const video = (title, url, provider) => ({ title, url, provider })

const generalGpx = readFileSync(new URL('../public/gpx/nz/the-general-intermedio.gpx', import.meta.url), 'utf8')
const generalPoints = [...generalGpx.matchAll(/<trkpt lat="([^"]+)" lon="([^"]+)"[^>]*>(.*?)<\/trkpt>/gs)].map(match => {
  const elevation = match[3].match(/<ele>([^<]+)<\/ele>/)?.[1]
  return [Number(match[1]), Number(match[2]), ...(elevation ? [Math.round(Number(elevation))] : [])]
})
const generalTrack = Array.from({ length: 300 }, (_, index) => generalPoints[Math.round(index * (generalPoints.length - 1) / 299)])
if (generalPoints.length < 300 || generalTrack.some(point => point.some(value => !Number.isFinite(value)))) throw new Error('Invalid The General GPX')

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
    first_descent: '2013-03-09/10 Alain Rohr, Annette Phillips, Nic Barth, Neil Silverwood',
    gps: '-44.4377022, 168.6837463', elevation: 924,
    details: { map_sheet: 'Matukituki Valley', rock: 'Alpine gorge', rock_zh: '高山峽谷', water: 'Only suitable in exceptionally low flow', water_zh: '僅極低水位適合進入', catchment: 'Not published', catchment_zh: '未公布', anchors: 'Not published', anchors_zh: '未公布', flood: 'Extreme', flood_zh: '極高' },
    approach_steps: [], route_sections: [section('Expedition canyon', '探險型峽谷', '9.5–10+ hrs', 'Remote, expert-only and normally a multi-day objective.')], topo_pages: [], recent_updates: [],
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
}

if (Object.keys(ROUTES).length !== 14) throw new Error('Expected exactly 14 NZ routes')

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

const finalCount = (await pb.collection('nz_routes').getFullList({ fields: 'id' })).length
if (finalCount !== 14) throw new Error(`Expected 14 database records, found ${finalCount}`)
console.log('NZ topo sync complete')
