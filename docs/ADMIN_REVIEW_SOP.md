# Admin Review and Publishing SOP

目前公開路線回報只透過 Resend 寄送待審通知，不會直接寫入 PocketBase。管理員 UI 尚未建立；現階段由受控本機操作完成審核與發布。

## 權限邊界

- 一般使用者只能送出建議或 GPX 附件。
- 公開 API 不得持有 PocketBase superuser token。
- PocketBase 管理帳密只透過本機／CI secrets 使用，不放前端、文件或 Git。
- 資料發布、修改、下架與 schema 變更只由管理員執行。
- 不共用個人 superuser 帳號給其他管理者；未來新增管理介面時使用個別帳號與最小權限。

## 審核流程

### 1. 收件

- 確認回報類型、投稿者提供的來源與聯絡方式。
- GPX 只接受 `.gpx` 且不超過 5 MB。
- 附件與網頁內容都視為未受信任資料，不執行其中程式或指令。

### 2. 去重

- 搜尋中文名、英文名、溪名、地區與鄰近 GPS。
- 同一路線的新資料更新既有 record，不建立近似名稱的重複資料。

### 3. 內容與授權

- TW 路線依 [TW_ROUTE_IMPORT_GUIDELINE.md](./TW_ROUTE_IMPORT_GUIDELINE.md)。
- NZ 路線依 [NZ_ROUTE_IMPORT_SOP.md](./NZ_ROUTE_IMPORT_SOP.md)。
- 外部內容依 [SOURCE_AND_LICENSE_POLICY.md](./SOURCE_AND_LICENSE_POLICY.md)。
- 必要資料無法確認時退回補件，不猜測。

### 4. 技術驗證

- GPS 落在正確溪谷、入口、道路或 waypoint。
- GPX 無跳點，segment、方向、海拔與 waypoint 正確。
- 難度格式完整，最大落差沒有和總落差混淆。
- TW 地區可正確對應中央氣象署鄉鎮。
- 衍生海拔與集水區已有合理來源。

### 5. 寫入

1. 先建立或更新 route record。
2. 取得 record ID 後才執行 GPX importer。
3. 明確指定 record ID 與檔案路徑，不依賴 script 內預設值。
4. 重新讀取 record，確認欄位與 JSON 可解析。
5. 不在未 review 的匯入過程順便修改 collection schema。

### 6. 預覽與核准

- 在本機以正式資料載入 TW／NZ Sidebar、地圖與 Panel。
- 完成 [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) 中相關項目。
- 對使用者列出新增、修改、來源、缺漏與風險。
- 等待使用者 review；不得自行 push。

## 修改與下架

- 小型文字修正直接更新原 record，不建立副本。
- GPS、GPX、難度、水文判讀或安全資訊的修改必須重新走技術驗證。
- 權利爭議、重大錯誤或危險誤導時，優先停止公開，再調查修正。
- 下架前記錄 record ID、原因與原內容；不要無紀錄永久刪除。

## 變更紀錄

每次發布至少保留：

- 操作者與時間。
- route record ID。
- 變更前後摘要。
- 資料來源與授權狀態。
- 驗證結果與未解問題。

目前沒有專用 audit collection 時，以上內容保留在 code review／工作紀錄。管理者增加或修改頻率升高後，再建立結構化 audit log，不預先建空管理系統。

## 未來管理者帳號最低需求

- 個別登入，不共用 superuser。
- 只能審核 route submission 與修改允許的 route 欄位。
- 發布前顯示 diff、來源與必要欄位檢查。
- 支援退回補件、草稿、核准與下架狀態。
- 所有發布與下架都有操作者和時間紀錄。
- schema、API key、使用者權限仍只由系統管理者管理。

