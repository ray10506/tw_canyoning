# Release Checklist

依本次變更勾選相關項目。純文件修改不需要重跑 UI；程式、資料、API 或依賴修改必須完成對應檢查。

## 變更範圍

- [ ] 已列出本次修改的檔案、資料與使用者行為。
- [ ] 沒有混入無關重構、格式化或生成檔。
- [ ] 現有未提交修改已保留，沒有被覆蓋。
- [ ] 新功能已更新對應 guideline 或資料契約。

## 資料

- [ ] PocketBase collection、欄位名稱與前端 query 一致。
- [ ] 必填值有效；未知值沒有被寫成 `0`、正常或安全。
- [ ] GPS、GPX、waypoint、海拔與集水區已在地圖核對。
- [ ] 中英文資料對應正確。
- [ ] 外部資料有來源與必要授權。
- [ ] Schema 變更有 backfill 與舊資料相容策略。

## 核心 UX

- [ ] TW、NZ、水文與搜尋模式能正確切換及定位。
- [ ] 搜尋確認後結果只出現在 Sidebar，清除後回到預設瀏覽。
- [ ] 路線／測站 focus 時，Sidebar 項目捲到可視區中央。
- [ ] 路線 Panel、測站卡與搜尋／設定卡不互相遮擋。
- [ ] Panel 開啟時地圖與 Sidebar 仍可操作。
- [ ] Loading、空結果、API 錯誤與重試狀態可理解。

## 顯示矩陣

- [ ] 繁體中文 + Dark。
- [ ] 繁體中文 + Light。
- [ ] English + Dark。
- [ ] English + Light。
- [ ] Desktop 寬螢幕。
- [ ] 直向平板。
- [ ] 390px 手機。

每個尺寸確認：無文字溢出、重疊、卡片觸邊、空白畫面或不可達控制項；手機主要觸控區至少 44px。

## 地圖與路線

- [ ] 底圖在允許 zoom 範圍內正常顯示。
- [ ] TW／NZ 切換 focus 到正確國家。
- [ ] GPX segment 無跨段直線，marker 與 waypoint 正確。
- [ ] cluster 在搜尋、layer 關閉與路線鄰近測站情境均正常。
- [ ] 詳情卡箭頭完成定位後才顯示並指向正確 icon。

## 天氣與水文

- [ ] TW 天氣開啟正確縣市／鄉鎮，NZ 天氣開啟正確區域。
- [ ] 五日預報含年份、單位、來源與進一步連結。
- [ ] 水位／雨量更新時間與時區正確。
- [ ] 缺測顯示 `—`，真正零值顯示 `0`。
- [ ] 7／14 日圖表日期、軸名、單位與資料日數正確。
- [ ] 鄰近水位站不超過 5 km，距離標示為「距路線」。

## API 與安全

- [ ] 非支援 method 回傳正確狀態碼。
- [ ] 輸入長度、GPS、檔案格式與大小均驗證。
- [ ] 上游失敗有 timeout、錯誤狀態與可理解訊息。
- [ ] credentials、tokens、Email 與私人資料沒有進入前端 bundle、log 或 Git。
- [ ] 公開路線 submission 仍只進入待審，不直接發布。

## 自動與人工檢查

```powershell
npx vue-tsc --noEmit
npm run build
git diff --check
git status --short
```

- [ ] 相關小型測試通過。
- [ ] 瀏覽器 console 無新增 error。
- [ ] 正式 build 通過；chunk warning 已評估是否為本次回歸。
- [ ] Diff 已由使用者 review。
- [ ] 未經使用者明確要求，不 commit、不 push。

## 部署後

- [ ] Vercel 正式網址可載入且版本正確。
- [ ] PocketBase、WRA、CWA、天氣與回報 API 可用。
- [ ] 用一條 TW、一條 NZ、一個水位站及一個雨量站做 smoke test。
- [ ] 分享 URL 能還原路線、搜尋、語言與篩選狀態。
- [ ] 若發現重大回歸，停止後續發布並回復上一個可用版本。

