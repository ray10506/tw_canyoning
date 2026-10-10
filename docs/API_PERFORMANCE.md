# API 效能觀測

入口：設定 → 管理者登入 → API 效能。此版本預設不傳送任何觀測資料，設定收集 URL 後才啟用。

## 量測範圍與定義

- 瀏覽器統一觀察 fetch：同站氣象／水文／回報 API、PocketBase 公開路線與歷史資料、Open-Meteo、OpenTopoData、WRA。新增外部 API 必須加到前後端標籤白名單，不會自動送出陌生網址。
- 標頭時間為 fetch 收到 Response；完整時間為網站讀取 json/text/blob/arrayBuffer/formData 完成，**包含呼叫端等待、下載及解析，不包含圖表繪製**。不 clone、不多讀一份回應，不改變原資料／錯誤。未讀取的 body 最多等待 60 秒後只記標頭，排除於完整時間分位數；自訂 stream reader 或 clone 後讀取不屬於本版完整量測範圍。
- P50/P95 使用 nearest-rank；只計完整 body 的樣本，失敗／標頭-only不混入。網路／HTTP／逾時／解析失敗分開，取消不算失敗，未知狀態不當成功或失敗。沒有完成樣本時不顯示假數字。
- 九個 Vercel API 入口都回傳 `Server-Timing`。`server` 是 handler 到送出 JSON/end 前的時間，未含平台啟動或 CDN；`upstream` 是 timedFetch 各次等待與讀取累計（也可能包含開始讀取前的等待）。平行查詢累計可超過 server 時間，兩者不能相減當成純 CPU 時間。
- CDN HIT 的 Server-Timing 可能是建立快取時的舊時間，不是本次執行。快取只認 `x-vercel-cache` 明確 HIT/MISS，其餘未知；不推測模組內快取。跨來源沒提供 timing/headers時未知。
- 大小來自 Content-Length 或 Resource Timing 的 encodedBodySize；缺值不當 0，可能為壓縮大小，非解析後物件大小。
- 圖磚與預報圖片使用 Resource Timing，獨立分類。跨站限制可能遮蔽大小、狀態；影像錯誤不保證有紀錄。
- 日期採伺服器收到批次的時間；後台以台灣時間顯示，裝置依請求頁載入時的 viewport 分類。這是樣本診斷，不是計費、SLA 或完整伺服器存取紀錄。

## 隱私與負載

- 只保存白名單功能標籤、固定結果代碼、時間／狀態／大小、裝置尺寸分類與環境。URL、query、測站 ID、座標、帳號、Token、request/response body、使用者識別、IP 不存入觀測資料表。
- 管理頁全部排除，收集請求用原生 fetch 不自我觀測。不送 cookies 或登入憑證，無永久瀏覽器佇列。
- 每 15 秒及頁面隱藏時 best-effort 送最多 25 筆，佇列最多 100，圖磚最多占 25 筆。超量、關頁、網路失敗會丟樣本，不重試、不阻擋網站。圖磚 burst 不會擠掉全部 API 名額。
- 收集端白名單 Origin（不是身分驗證，仍可偽造）；16 KB body、25 筆 batch、欄位驗證與明確投影，不接受任意網址或額外私密欄位。
- SQLite transaction 執行全站 120 批／滾動分鐘及 10,000 批／滾動日硬上限，滿額回 429。上限保護儲存，不防止惡意者耗盡額度；正式服務可另加反向代理流量限制。
- `api_metrics` 只能管理員 list/view；不能由公開 collection API 寫入。公共 hook 限定寫入通道，不能修改或讀回資料。
- 每小時刪最多 1,000 批超過七天的資料。服務持續運行時保留約七天；若長期停機會在恢復後分批清理。
- 後台最多讀最近 2,000 批（最多 50,000 筆），超過明確顯示截斷。環境／裝置／地區在這批樣本內篩選，使用縮短時間範圍降低截斷。

## 啟用

1. 使用現有 `site_admins`。本機設定安裝用 `PB_URL/PB_EMAIL/PB_PASSWORD`，執行 `node scripts/setup-admin.mjs` 看計畫，review 後加 `--apply`；已安裝的 collection 與帳號會略過，因此既有後台只會新增 api_metrics。沿用 schema 備份不覆寫機制；需要時指定新的 `ADMIN_BACKUP_PATH`。也可隨完整後台安裝。
2. 部署 `pocketbase-fly/pb_hooks/telemetry.pb.js`、`telemetry.cjs`，沿用目前 PocketBase hooks Dockerfile。PocketBase 設 `TELEMETRY_ORIGINS=https://tw-canyoning.vercel.app`（預設此值）；自訂網域加入逗號分隔清單。預覽網域必須逐一授權，測試 localhost不要加到正式環境。
3. 前端 build 設定 `VITE_TELEMETRY_URL=https://raych-pocketbase.fly.dev/api/site-telemetry/collect`；正式環境設 `VITE_TELEMETRY_ENV=production`。本機／預覽設 test，未設定也視為 test。這兩個值非 secret。
4. 部署前端與 Vercel APIs；沒有新增 Vercel Function，仍為 9 個入口。僅更新前端不會自動安裝 PocketBase hooks/collections。
5. 公開網站載入路線／氣象，等待一批送出；登入後台按重新整理確認。直接的氣象署本地 Vite proxy 不會有自訂 server/upstream 計時，正式 Vercel handler才有。

停用：移除前端 VITE_TELEMETRY_URL 並重新打包。不要公開 api_metrics 的 list/view。既有樣本繼續由保留期限清理。

## 驗證

- `node scripts/check-api-metrics.mjs`：標籤／秘密排除、P50/P95、原回應及錯誤保留、Server-Timing。
- `node scripts/check-admin.mjs`：一次性 Docker 驗證權限、collector拒收、欄位投影及寫入上限，不碰正式資料。
- 既有台灣／紐西蘭 API regression tests、vue-tsc、Vite build。
- 桌機／手機瀏覽器：環境、裝置、時間篩選、明細與空資料狀態；測試數字不作為正式 API 性能結論。
