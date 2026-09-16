---
name: "Taiwan Canyoneering Map"
description: "A map-first field console for comparing Taiwan canyon routes, weather, and hydrology before departure."
colors:
  primary: "#6c8ef5"
  primary-hover: "#91a8ff"
  primary-selected: "#1e2d6b"
  canvas-dark: "#0f172a"
  surface-dark: "#1a1a2e"
  panel-dark: "#12122a"
  raised-dark: "#171733"
  hover-dark: "#252545"
  line-dark: "#2a2a4a"
  border-dark: "#3a3a5a"
  text-dark: "#e0e0e0"
  text-strong-dark: "#ffffff"
  text-muted-dark: "#888888"
  canvas-light: "#dfe5ea"
  surface-light: "#dfe7ee"
  panel-light: "#e5ebf0"
  raised-light: "#f0f3f6"
  line-light: "#cbd3db"
  text-light: "#172033"
  text-muted-light: "#64748b"
  water: "#38bdf8"
  normal: "#6abf8a"
  watch: "#d6bd55"
  warning: "#e79a5e"
  danger: "#e87979"
  rating: "#f0a030"
typography:
  headline:
    fontFamily: "Noto Sans TC, system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  title:
    fontFamily: "Noto Sans TC, system-ui, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Noto Sans TC, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Noto Sans TC, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  data:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  icon: "4px"
  control: "6px"
  field: "8px"
  card: "12px"
  sheet: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.panel-dark}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "8px 20px"
    height: "40px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted-dark}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "8px 12px"
    height: "40px"
  input:
    backgroundColor: "{colors.panel-dark}"
    textColor: "{colors.text-dark}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "8px 12px"
    height: "40px"
  route-panel:
    backgroundColor: "{colors.panel-dark}"
    textColor: "{colors.text-dark}"
    rounded: "0"
    width: "452px"
  station-card:
    backgroundColor: "{colors.panel-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.card}"
    padding: "16px 24px"
---

# Design System: Taiwan Canyoneering Map

## Overview

**Creative North Star: "溪谷行前控制台"**

這是一套以地圖為主體、為出發前判斷服務的操作介面。視覺應安靜、密度適中、資料導向；品牌感來自精準的藍色互動狀態、水文圖示與一致的資訊層級，而不是裝飾性背景或大量卡片。

台灣路線是目前的行為基準。新的畫面必須沿用本文件的色彩角色、元件狀態與響應式行為；既有元件中的一次性色碼或尺寸若與本文件衝突，不構成新規則。使用者應在 30 秒內依序看懂難度、地區、天氣與鄰近水文，且不必離開地圖脈絡。

**Key Characteristics:**
- 地圖永遠是主舞台，Sidebar、Panel 與測站卡都是輔助操作層。
- 深色模式低眩光；淺色模式使用冷灰表面，不使用突兀的純白大面積。
- 藍色只表達選取、焦點、連結與主要操作，不作一般裝飾。
- 水文資訊提供數值與資料判讀，不直接宣稱路線安全或危險。
- 桌面保留地圖與多欄比較效率；手機一次聚焦一項工作。

## Colors

主調是冷灰藍的操作介面，難度與水文狀態色只在有明確語意時出現。

### Primary
- **定位藍** (`primary`)：目前選取、主要按鈕、連結、鍵盤焦點與作用中的控制項。
- **定位藍亮色** (`primary-hover`)：滑鼠懸停與深色表面上的次要連結。
- **深藍選取面** (`primary-selected`)：選中的路線列、分段控制與頁籤背景。

### Secondary
- **水流藍** (`water`)：水位、A 級、水文數值和相關圖表，不可替代主要操作藍。
- **評分金** (`rating`)：星等與時間難度；沒有星等時直接省略，不顯示空星。

### Tertiary
- **正常綠** (`normal`)：低於警戒或近期雨量較少。
- **留意黃** (`watch`)：需要搭配其他資料判讀。
- **警告橘** (`warning`)：偏高或明顯變化。
- **危險紅** (`danger`)：達警戒、錯誤或破壞性操作。

狀態色必須同時附上文字或圖示，不可只靠顏色傳意。沒有門檻或資料不足時使用 muted，不得顯示為正常綠。

### Neutral
- **深色畫布** (`canvas-dark`)：載入與地圖外的最底層背景。
- **深色側欄** (`surface-dark`)：Sidebar 與底部工具列。
- **深色面板** (`panel-dark`)：路線 Panel、搜尋與測站卡。
- **深色抬升面** (`raised-dark`)：輸入框、狀態摘要和局部群組。
- **深色分隔線** (`line-dark`)：列表分隔與 Panel 結構線。
- **淺色畫布／側欄／面板** (`canvas-light`, `surface-light`, `panel-light`)：以冷灰建立層次，避免純白。
- **淺色抬升面** (`raised-light`)：輸入框與選項；只在小面積內容層使用。

### V-grade Difficulty Colors

路線難度使用六個獨立色組，以 `.v1`–`.v6` class 掛在難度 badge 與標籤上，每個 class 內部定義 `--vg-bg`（背景）和 `--vg-fg`（前景文字）兩個 CSS 自訂屬性：

| Class | `--vg-bg` | `--vg-fg` | 難度 |
|-------|-----------|-----------|------|
| `.v1` | `#0c2618` | `#4ade80` | V1 — 入門 |
| `.v2` | `#162508` | `#a3e635` | V2 — 初級 |
| `.v3` | `#2a2200` | `#fbbf24` | V3 — 中級 |
| `.v4` | `#2a1200` | `#fb923c` | V4 — 進階 |
| `.v5` | `#2a0606` | `#f87171` | V5 — 困難 |
| `.v6` | `#190826` | `#c084fc` | V6 — 技術 |

V-grade 色組只用於難度識別，不可挪作狀態語意（正常、警告、危險）使用。不知道或未評级的路線不顯示 badge，不得預設為 V1。

### CSS Token Naming

CSS 自訂屬性統一使用 `--color-` 前綴，對應 frontmatter 的裸名：

| Frontmatter 名稱 | CSS 自訂屬性 |
|-----------------|-------------|
| `primary` | `--color-primary` |
| `primary-hover` | `--color-primary-hover` |
| `canvas-dark` | `--color-canvas` |
| `surface-dark` | `--color-surface` |
| `panel-dark` | `--color-panel` |
| `raised-dark` | `--color-raised` |
| `line-dark` | `--color-line` |
| `text-dark` | `--color-text` |
| `text-strong-dark` | `--color-text-strong` |
| `text-muted-dark` | `--color-text-muted` |

深色為預設；淺色值在 `html[data-theme='light']` 下覆寫同一組 `--color-*` 變數。

**尚未定義為 CSS 變數的 token（待補）：** `primary-selected`（`#1e2d6b`）、`border-dark`（`#3a3a5a`）、`hover-dark`（`#252545`）、`water`、`normal`、`watch`、`warning`、`danger`、`rating`。這些 token 目前在各元件中直接 hardcode，補齊後應換為 `var(--color-*)` 引用。

**The One Blue Rule.** 同一畫面的主要互動色只有 `primary`；不得為新功能另選一套紫、青或品牌藍。

**The Status Is Data Rule.** 綠、黃、橘、紅只用於可解釋的實際狀態，並顯示數值、時間與文字判讀。

**The No Pure White Surface Rule.** 淺色模式不可使用大面積 `#fff`；純白只可作深色背景上的強文字或小型圖示細節。

## Typography

**Display Font:** 不使用獨立展示字體；本產品不是行銷頁。
**Body Font:** Noto Sans TC，後接系統 sans-serif。
**Label/Mono Font:** GPS、海拔、水位與雨量等可比較數值使用系統 monospace；一般單位與說明仍用本文字體。

**Character:** 字體應緊湊、清楚、可快速掃描。視覺層級主要由字重、尺寸、間距建立，不依賴大寫、寬字距或超大標題。

### Hierarchy
- **Headline**（700、`1.1rem`、1.25）：路線名稱、測站名稱與 Panel 主標題。
- **Title**（700、`0.9rem`、1.3）：Sidebar 路線名稱、卡片判讀標題。
- **Body**（400、`0.875rem`、1.55）：路線說明、數值說明與表單內容。
- **Label**（600、`0.75rem`、1.4）：欄位名稱、Tab、按鈕與單位標籤。
- **Caption**（400、`0.68–0.72rem`、1.4）：更新時間、資料來源和輔助說明。
- **Data**（500、`0.875rem`、1.5）：GPS、海拔、水位、雨量和距離；使用 tabular numerals。

**The Field Scale Rule.** 工具介面標題上限為 `1.1rem`；只有水位或累積雨量等主要判讀值可放大至 `1.6–1.7rem`。

**The Headline Balance Rule.** 所有 Headline 與 Title 層級的文字套用 `text-wrap: balance`，避免單行孤字換行。Body 與 Caption 不套用，保留自然斷行。

**The Literal Unit Rule.** 數值旁必須就近顯示 `m`、`mm`、`km`、`hr` 等單位，座標、圖表軸與距離不可只放裸數字。

## Theme Switching

本介面**深色優先**。預設 `:root` 定義完整深色 token 集；淺色 token 只在 `html[data-theme='light']` 下覆寫。切換由使用者在設定面板中明確操作，設定儲存於 `localStorage`。

**系統偏好（`prefers-color-scheme`）目前不處理。** 未手動切換的使用者一律看到深色介面，這對野外使用場景是合理的預設。若未來要支援系統偏好，作法為：在 `html:not([data-theme])` 下加入 `@media (prefers-color-scheme: light)` 覆寫，並確保所有 token 在無 `data-theme` 屬性時都有定義。

淺色模式的 token 值與深色不做簡單 invert，改用較深的冷灰表面（`#dfe5ea`）讓對比可讀而不刺眼。

## Layout

桌面採 Sidebar + 全幅地圖 + 右側詳情 Panel。Sidebar 預設寬 `280px`，可調整範圍 `200px` 至視窗一半；路線 Panel 預設寬 `452px`，可調整範圍 `380–900px`。搜尋與設定是地圖上的暫時工具卡，不新增永久欄位，也不與 Sidebar 重複顯示同一份結果清單。

內容使用 4px 基礎節奏：控制項間距 4–8px、群組 12–16px、Panel 水平內距 20–24px、主要區段 24–32px。列表維持緊湊，路線列以 10px 垂直、16px 水平內距為基準。

路線 Panel 的主要資訊固定依序為：**難度 → 地區 → 天氣 → 鄰近水文**。其後才是時間與進場、GPS／GPX、海拔、風險和補充資料。沒有資料的區塊直接隱藏；未公布但必須保留的欄位降低對比，不得與有效資料同等突出。

### Responsive behavior
- `≤640px` 或直向窄螢幕：Sidebar 佔滿寬度；選擇路線或測站後自動收合，露出地圖與詳情。
- 手機路線詳情從底部開啟，基準高度 `76dvh`，頂部圓角 `16px`，內容獨立捲動。
- 手機水位／雨量卡距四邊至少 `12px`，最大高度不超過可視區 `85dvh`；不觸底、不被瀏覽器安全區遮住。
- Tab 保持單行並橫向捲動，不折成兩行，也不新增只為容納少量內容的 Tab。
- 地圖縮放上限不得超過底圖可用層級；任何搜尋、Panel 或卡片開啟時，地圖仍可縮放與拖曳。

**The Map Stays Present Rule.** 桌面開啟任何資訊時仍需看得到可操作的地圖；不得使用全畫面遮罩或背景模糊阻斷地圖與 Sidebar。

**The One Result List Rule.** 搜尋編輯發生在搜尋卡；按下確認後，結果只出現在 Sidebar。右側搜尋卡不再保留第二份長列表。

## Elevation & Depth

介面以色調分層為主、陰影為輔。Sidebar 與固定 Panel 依靠位置與 1px 結構線分層；浮動搜尋卡、設定卡、測站卡與底部工具列才使用柔和陰影。不得同時用厚邊框與重陰影製造雙重外框。

### Shadow Vocabulary
- **工具卡** (`0 8px 32px rgba(0,0,0,0.5)`)：搜尋、設定與較大的浮動卡。
- **測站卡** (`0 4px 24px rgba(0,0,0,0.5)`)：固定在地圖圖示附近的水位／雨量資訊。
- **右側 Panel** (`-8px 0 40px rgba(0,0,0,0.7)`)：只用於桌面右側抽屜。
- **淺色浮層** (`0 8px 28px rgba(30,41,59,0.2)`)：Light Mode 的工具卡與 Panel。

**The Structural Shadow Rule.** 陰影只說明浮動層級，不用作裝飾；列表、資訊區段與普通控制項保持平面。

## Shapes

圓角依元件角色固定，不依畫面自由選擇：圖示按鈕 `4px`、小型控制與 badge `6px`、輸入框與列表群組 `8px`、浮動卡 `12px`、手機 Bottom Sheet `16px`。完全膠囊形只用於 Tab、篩選 chip、短狀態 badge 與底部工具列，不用於一般卡片或長文字按鈕。

Panel 貼齊螢幕邊緣的一側保持直角；內容仍需有 20–24px 內距。地圖上的測站卡保留指向圖示的箭頭，但箭頭只在完成位置計算後顯示。

**The Radius Has Meaning Rule.** 相同角色使用相同圓角；禁止每個新 Card 自訂 10、14、18、20px 等近似值。

## Components

### Buttons
- **Primary:** 實心定位藍、深色文字、`8px` 圓角；一個操作區只保留一個主要按鈕，例如「確認」。
- **Secondary:** 透明或 raised surface、1px 邊框；用於下載、重試與次要命令。
- **Icon button:** 優先使用專案現有圖示或一致 SVG；關閉使用熟悉的 X 圖示並提供 `aria-label`，不顯示多餘文字。
- **States:** hover 只改背景或邊框；focus-visible 使用 2px 定位藍輪廓與 2px offset；disabled 降低透明度但保留可辨識標籤。
- 粗指標裝置的可點區至少 `44 × 44px`。

### Segmented Controls, Tabs, and Chips
- 分段控制用於互斥選擇；多選範圍必須允許各自切換，全部選滿時才收斂為「全部」。
- 搜尋範圍預設「路線」，避免進入畫面就混合大量路線與測站。
- Tab 只切換同一物件的資訊面；內容彼此高度相關時合併，例如進場路線與時間規劃。
- Filter chip 顯示已套用條件。點擊 chip 本體重新開啟搜尋卡；只有獨立的移除按鈕才清除條件。

### Cards / Containers
- **Route Panel:** 桌面固定右側並可調寬；手機為 Bottom Sheet。Panel 不建立背景遮罩。
- **Station Card:** 桌面貼近對應測站 icon，依可用空間向左或向右開啟，不與 Route Panel 重疊；手機固定在安全邊距內。
- **Search / Settings Card:** 固定於地圖上，距視窗 16px；手機為 8px。設定卡與底部設定按鈕間需留出明確間距。
- 卡片內不得再放純裝飾卡片。狀態判讀卡例外，因其承擔主要決策資訊。

### Inputs / Fields
- 深色使用 panel surface、1px strong border、`8px` 圓角；Light Mode 使用 raised light surface，不使用純白。
- placeholder 必須說明目前可搜尋的類型；聚焦只改為定位藍邊框，不使用發光效果。
- 清除搜尋使用欄位內的獨立 X；套用篩選使用清楚的「確認」按鈕，不能以關閉卡片代替提交。

### Sidebar and Result Lists
- TW、NZ、水文是同層級瀏覽模式。切換 TW/NZ 時地圖自動定位到對應國家；水文模式回到台灣。
- 路線與測站列都必須是語意化 button，可用 Enter／Space 操作。選取列使用整列底色，不加白色外框。
- 選取或從地圖 focus 一筆結果時，對應項目捲動到 Sidebar 可視範圍中央。
- 列表固定顯示名稱、類型／難度與位置。水文搜尋需顯示匹配到的河川或地址，且只高亮實際匹配欄位。

### Search and Map Results
- 使用者先在搜尋卡編輯條件；按「確認」後卡片關閉、Sidebar 顯示結果、地圖 `fitBounds` 到結果範圍。
- 地圖只顯示符合目前搜尋條件的物件；即使水文 Layer 關閉，搜尋命中的測站仍必須顯示。
- 相鄰測站預設聚合成 cluster；目前選取或由路線叫出的鄰近測站不可縮回 cluster，直到詳情關閉。
- 清除全部篩選必須是明確命令，不可由關閉搜尋卡、點選 filter chip 或開啟詳情間接觸發。

### Route Detail
- Header 顯示路線名稱與有效難度 badge；不要再顯示一份未拆解的重複難度字串。
- 快速資訊先呈現難度，再呈現地區、五日天氣、五公里內鄰近水文。距離上方或欄首必須標示「距路線」。
- 天氣顯示近五日摘要與年份，並提供官方來源連結供進一步確認。
- 鄰近水位站只取路線五公里內；雨量、水位與天氣不得被寫成路線安全保證。
- 圖片與原始路線圖可點擊在新分頁開啟；外部連結需清楚標示來源。

### Water and Rain Station Cards
- 水位與雨量採相同資訊結構：站名／位置 → 目前判讀 → 主要數值 → 時間序列 → 更新時間／資料來源。
- 歷史圖表顯示完整日期與年份、X/Y 軸名稱和單位。缺測日顯示 `—`，不得當成 `0`。
- 「近 7 天／14 天」表示日曆範圍；若資料不足，寫明「最近 7 個完整日，目前取得 6 日」等實際狀況。
- 雨量圖下載為 PNG；下載按鈕需寫出格式。
- 地址不強制翻譯，但英文介面須以 `Location` 標示其語意。

### Loading, Empty, Error, and Missing Data
- 載入中使用與最終內容相同尺寸的 skeleton，避免卡片和指向箭頭先分離再跳位。
- API 失敗需顯示資料來源、問題與「重試」；不可讓舊資料看起來像即時資料。
- 真正的 0 才顯示 `0`；未知、未公布、無門檻與缺測一律顯示 `—` 或隱藏區塊。
- 空結果要說明可調整哪一項條件，不只顯示「沒有資料」。

### Motion
- hover 與控制狀態轉場使用 `150ms`；Sidebar 開合使用 `300ms`；手機 Bottom Sheet 使用 `280ms cubic-bezier(0.32, 0.72, 0, 1)`。
- 動畫只用來說明開合、選取與載入，不讓地圖標記、數值或安全狀態持續裝飾性跳動。
- 遵守 `prefers-reduced-motion`：非必要動畫關閉，地圖定位改為立即完成或縮短。

## Scrollbar

統一使用細 scrollbar（`scrollbar-width: thin`）。深色模式 thumb `#65749d`、track `#1a1a2e`；淺色模式 thumb `#82909e`、track `#e3e8ed`。thumb 帶 2px solid border 與 track 同色，製造懸浮感。hover 時 thumb 顏色提亮，不改變尺寸。定義在全域 `style.css`，各元件不覆寫。

## Implementation Notes

記錄目前已知的技術債，供後續迭代參考。這些狀況不構成設計規則的例外，只是尚未完成的收斂工作。

### Token 使用現況

- **RouteDetail.vue（TW 主元件）** 幾乎全部使用 hardcode 色碼，尚未引用 `--color-*` token。這是最大的優先收斂項。
- **NzRouteDetail.vue** 在 `.nz-route-panel` 範圍內自定義一組平行 token（`--bg`、`--bg2`、`--bg3`、`--cyan`、`--dim`、`--muted` 等），值與全域 token 一致但命名不同。其中 `--cyan` = `--color-primary`，`--cyan2` = `--color-primary-hover`。待 TW 元件完成 token 收斂後，NZ 元件亦應改用全域 token。
- **狀態色 token**（`water`、`normal`、`watch`、`warning`、`danger`、`rating`）和 `primary-selected` 尚未定義為 CSS 變數，目前直接 hardcode 在各元件。

### Spacing

frontmatter 的 `spacing.*` 值（xs/sm/md/lg/xl/xxl/section）僅作設計參考用，**不是 CSS 自訂屬性**，各元件直接使用 px 值。目前沒有要改成 CSS 變數的計畫，維持現狀即可。

### Typography Classes

Headline / Title / Body / Label / Caption / Data 是設計層級描述，**不對應 utility class**。各元件依情境直接設定 `font-size`、`font-weight`、`line-height`，不走統一 class。Caption 範圍 `0.68–0.72rem` 供判斷用，不強制特定值。

## Do's and Don'ts

### Do:
- **Do** 先沿用本文件 token 與既有元件角色，再建立新元件。
- **Do** 讓使用者在路線 Panel 開頭依序看到難度、地區、天氣、鄰近水文。
- **Do** 保持地圖、Sidebar 與資訊卡可交互操作，不用模糊背景製造焦點。
- **Do** 為所有 icon button 提供可讀名稱，為所有互動列使用 button 或 link。
- **Do** 同時測試 390px 手機、直向平板與桌面，確認文字不溢出、卡片不觸邊、地圖仍可操作。
- **Do** 中英文都顯示欄位名稱、單位、日期年份、更新時間與資料來源。

### Don't:
- **Don't** 為新畫面新增另一套主色、陰影、圓角或卡片背景。
- **Don't** 使用大面積純白、紫藍漸層、裝飾光球、玻璃模糊或巢狀卡片。
- **Don't** 讓搜尋卡與 Sidebar 同時顯示兩份完整結果清單。
- **Don't** 讓測站卡遮住 Route Panel、脫離測站 icon、貼齊螢幕邊緣或阻止地圖操作。
- **Don't** 把缺測、未知或未公布資料顯示為 `0`、正常或安全。
- **Don't** 只用顏色、星號、裸距離或裸數字傳達需要判斷的資訊。
- **Don't** 因少量新增內容就建立新 Tab；先併入最接近的現有任務流程。
- **Don't** 在元件內自定義平行 token 命名（如 `--cyan`、`--bg2`）；新元件一律引用 `--color-*` 全域 token。
- **Don't** 把 hardcode 色碼視為既成規則；元件中的一次性色碼是技術債，不構成設計決策。
