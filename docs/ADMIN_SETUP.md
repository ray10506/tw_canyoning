# 管理後台安裝與驗收

入口 `/admin`，也可由地圖的設定卡點選「管理者登入」。使用獨立 `site_admins` 帳號；公開網站仍不需登入。
此變更是可部署的程式碼，**不代表正式 PocketBase 已建立帳號或套用 schema**。

## 架構與範圍

- 前端獨立載入管理頁，登入憑證只放記憶體，重新整理需重新登入。
- PocketBase 驗證管理員；collection 的直接新增、修改與刪除鎖定。
- `/api/site-admin/save` 是 PocketBase hook 路由，不是 Vercel Function。只允許管理員編輯列出的文字欄位和審核狀態。
- 路線寫入與 `site_audit` 操作紀錄在同一 transaction；失敗一起回滾。更新時間不同會回傳 409，避免覆蓋其他視窗修改。
- 路線草稿／下架在 PocketBase list/view rules 擋掉，不能只靠前端隱藏。既有沒有狀態的路線保持原公開權限。
- 保存已發布路線會立即更新公開內容；要先停止公開，請明確改為草稿或下架。此版沒有獨立的發布中／待發布修訂副本。
- GPX、地形、水況等進階資料保留原值，沿用既有匯入流程。投稿 GPX 是受保護附件，不自動匯入或發布。
- 回報支援待審核、待補件、已處理、不採用，狀態變更不會自動寄信。帶入草稿後需另行標记原回報為已處理。
- 資料狀態只檢查水位歷史最新收集紀錄；不是所有氣象／水文上游的健康監測。

## 正式啟用順序

1. 先備份 PocketBase **完整資料庫和附件**，記錄目前版本與 collection rules。測試使用本機映像 PocketBase 0.38.1；正式環境先確認版本與 hook API 相容。
2. 將 `pocketbase-fly/pb_hooks/` 安裝到 PocketBase 的 `/pb_hooks`。Fly 設定已改由同目錄 Dockerfile 複製 hooks，從 `pocketbase-fly` 目錄部署。映像來源沿用既有設定；部署前應確認使用的版本，勿順帶升級正式資料庫。
3. 在受控本機環境設定 `PB_URL`、`PB_EMAIL`、`PB_PASSWORD`（superuser，只用於安裝）。執行 `node scripts/setup-admin.mjs` 先看唯讀計畫。
4. 安裝帳號可由 PocketBase dashboard 手動建立，或在本機設定 `ADMIN_EMAIL`、`ADMIN_PASSWORD`、選填的 `ADMIN_USERNAME` 與 `REPORT_PB_EMAIL`、`REPORT_PB_PASSWORD`。管理員可用 username 或 Email 登入。兩組為不同帳號、不同用途，使用強且不同的密碼。
5. Review 計畫後執行 `node scripts/setup-admin.mjs --apply`。會新增管理／收件／審核紀錄 collections，為路線增加狀態及來源欄位，保留既有 public restrictions。Collection schema 備份寫在 Git 忽略的 `admin-schema-backup.local`，此檔可能敏感，不可提交。它不能替代完整資料備份。重跑前先保管既有 schema 備份，或指定新的 `ADMIN_BACKUP_PATH`；工具拒絕覆寫備份。
6. PocketBase dashboard 開啟 rate limits，限制 `site_admins` 的登入請求；禁止公開註冊、OAuth 與權限自行修改。這些 collection 建立時已鎖住 create/update/delete/manage rules。
7. Vercel 加入 server-only `REPORT_PB_URL`、`REPORT_PB_EMAIL`、`REPORT_PB_PASSWORD`。收件帳號只能建立 pending submissions，不能查看清單、修改路線或審核；**不可使用 superuser**。沿用 `RESEND_API_KEY` 寄通知。前端只需要現有 `VITE_PB_URL`。
8. 部署前端並依下列清單驗收。不需要新增 Vercel Function，目前仍為 9 個入口，低於 Hobby 的 12 個限制。

未設定任何 `REPORT_PB_*` 時，維持原本僅寄信模式。只設定部分變數或保存失敗會回報失敗，避免假成功；保存成功後即使寄信失敗也算收件成功，管理員可在清單查看。過去電子郵件不會自動匯入。

## 驗收

- `node scripts/check-admin.mjs`：Docker 建立一次性隔離資料庫；實際驗證未登入、不同角色、禁止直接寫入、草稿與下架隔離、版本衝突、原子操作紀錄、回報與受保護 GPX。結束刪除該次測試容器，不碰 `pb_data`。需本機 Docker 與既有 PocketBase 映像。
- `node scripts/check-route-submit-api.mjs`：原公開投稿 API 相容性與驗證。
- `npx vue-tsc --noEmit`、`npm run build`。
- 瀏覽器：登入失敗／成功、TW/NZ 切換、搜尋、草稿、發布、下架、審核、登出；桌機、390px 手機、820px 平板。
- 正式環境另用無登入視窗確認草稿不可讀、已發布可讀、下架不可讀，回報 GPX 沒有管理員 file token 不能下載。

## 回復

優先回復前端並保留後端隔離規則；回報可移除全部 `REPORT_PB_*` 回到僅寄信。不要直接還原「全部公開」的舊 rules，否則新建草稿／下架資料可能外流。完整資料庫回復需先保留上線後收到的新回報與操作紀錄。

PocketBase 官方依據：[API rules](https://pocketbase.io/docs/api-rules-and-filters/)、[自訂路由與驗證](https://pocketbase.io/docs/js-routing/)、[交易式寫入](https://pocketbase.io/docs/js-records/#transaction)。
