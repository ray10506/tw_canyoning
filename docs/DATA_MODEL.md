# Data Model and Migration Guideline

本文件定義前端、Vercel Functions、PocketBase 與匯入腳本共用的資料契約。新增欄位或 collection 前先更新本文件，再修改程式。

## 基本規則

- 未知值使用空值或省略欄位，不使用 `0`、`false` 或「正常」代替未知。
- 距離、海拔、雨量、水位與集水區使用數值欄位；UI 負責顯示單位。
- GPS 統一使用 WGS84 十進位座標，順序為 `latitude, longitude`。
- 時間存 ISO 8601；無時區的 WRA 時間按 `Asia/Taipei` 解讀。
- JSON 欄位必須先解析驗證，再寫入資料庫；前端不可依賴無效 JSON 的容錯。
- 前端公開讀取的欄位不放 credentials、私人聯絡資料或內部審核備註。

## PocketBase collections

### `canyon_routes`

台灣正式溪降路線。前端目前只載入 `type = '溪降'` 的紀錄。

| 欄位 | 型別 | 必要性 | 說明 |
|---|---|---|---|
| `id` | text | 系統 | PocketBase record ID。 |
| `name` | text | 必填 | 中文路線名稱。 |
| `name_en` | text | 選填 | 經校對的英文名稱。 |
| `region` | text | 必填 | `縣市 鄉鎮`，供顯示、搜尋與天氣定位。 |
| `region_en` | text | 選填 | 對應英文地區。 |
| `type` | text | 必填 | TW 溪降路線固定為 `溪降`。 |
| `grading` | text | 必填 | `V# A# I-VI`，有公布星等才附加。 |
| `gps` | text | 必填 | 已驗證的入溪點。 |
| `max_drop` | text | 選填 | 最大單一落差，包含 `m`。 |
| `approach` | text | 選填 | 進場方式。 |
| `total_time` | text | 選填 | 完整行程時間。 |
| `deep_pool` | text | 選填 | `有`、`無`或`不確定`。 |
| `ab_shuttle` | text | 選填 | 接駁方式或`不需要`。 |
| `note` | text | 選填 | 補充、來源與外部連結。 |
| `gpx_track` | text/JSON | 選填 | 分段後的路線軌跡。 |
| `gpx_waypoints` | text/JSON | 選填 | 導航點。 |
| `elevation` | number | 衍生 | 公尺，不附單位。 |
| `catchment_km2` | number | 衍生 | 平方公里，不附單位。 |
| `catchment_sampled` | bool | 衍生 | 完成可信取樣才為 `true`。 |
| `catchment_gps` | text | 衍生 | 實際集水區取樣座標。 |

若新增 TW 欄位，必須同步檢查 `src/App.vue` 的 `twFields`，否則資料存在 DB 仍不會傳到 UI。

### `nz_routes`

紐西蘭正式路線。共同欄位沿用 `canyon_routes`，並可包含 `location`、`subtitle`、`character`、分段時間、風險、媒體與 topo 等延伸欄位。完整契約與匯入方式見 [NZ_ROUTE_IMPORT_SOP.md](./NZ_ROUTE_IMPORT_SOP.md)。

### `water_level_observations`

| 欄位 | 型別 | 必要性 | 說明 |
|---|---|---|---|
| `station_id` | text | 必填 | 對應 `water-stations.json` 的站號。 |
| `observed_at` | date | 必填 | WRA 實際觀測時間。 |
| `collected_at` | date | 必填 | 系統抓取時間。 |
| `level_m` | number | 必填 | 水位公尺值。 |

`station_id + observed_at` 必須唯一；`observed_at` 需有索引。現行保留期為 90 日。

### 靜態測站資料

- 水位站：`src/data/water-stations.json`
- 雨量站：`src/data/rainfall-stations.json`

測站 ID 是與外部 API 對接的主鍵，不可因顯示名稱變更而修改。地址未知時留空，不得填 `0`。

## GPX JSON 契約

軌跡保留 segment，避免不同段落被畫成跳接直線：

```json
[
  [[24.1, 121.1, 800], [24.2, 121.2, 780]],
  [[24.3, 121.3], [24.4, 121.4]]
]
```

每點依序為 `[lat, lon]` 或 `[lat, lon, elevationMetres]`。Waypoint：

```json
[
  { "seq": 1, "lat": 24.1, "lon": 121.1, "ele": 800, "name": "入溪點" }
]
```

- `seq` 從 1 開始並按行程順序排列。
- `lat`、`lon` 必須是有效數字。
- `ele`、`name`、`detail` 可省略。
- 不保存心率、速度、裝置 ID 等與路線無關資訊。

## API 邊界

- `POST /api/routes/submit` 只建立待審通知，不寫正式 collection。
- 公開端點只接受 allowlist 欄位，並驗證長度、GPS 與 GPX 大小。
- WRA/CWA proxy 不回傳 API key，也不把上游錯誤偽裝成空資料。
- 管理員寫入必須由伺服器或本機受控腳本完成，不把 PocketBase 管理權限放進前端。

## Schema 變更流程

1. 說明使用者需求與現有欄位為何不足。
2. 更新本文件並列出新欄位的型別、預設值與空值語意。
3. 先做 additive change；同一版本不直接刪除或改名舊欄位。
4. 執行 backfill，記錄成功、跳過與錯誤筆數。
5. 更新前端欄位查詢、型別、API allowlist 與匯入腳本。
6. 驗證舊資料在新程式仍能讀取。
7. 經 review 後部署；確認無使用者再讀舊欄位才移除。

資料匯入 script 不應順便擴充 schema。需要新增欄位時，將 schema 變更視為獨立、可 review 的操作。

