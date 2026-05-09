# Global API 遷移狀態（已中止）

## 結論
此專案目前 runtime 入口為 `index.html` 內的 legacy `<script src="...">` 載入鏈，未啟用 bundler/ESM 入口。
因此「Global API 轉 ESM」遷移計畫已中止，並回收未接入 runtime 的 ESM 草案檔案。

## 目前實際架構
- 入口：`index.html` 依序載入 `render.js` / `map.js` / `calendar.js` 等 legacy 腳本。
- 依賴方式：`config.js` 仍由 `window.KLawsRender` / `window.KLawsMap` / `window.KLawsCalendar` 取用 API。
- 未使用檔案（已回收）：
  - `modules/calendar.js`
  - `modules/map.js`
  - `modules/render.js`
  - `modules/compat-global.js`

## 後續原則（單一追蹤）
- 在未切換入口為 ESM 前，不再保留未接線的 `modules/` 過渡檔。
- 若未來重啟遷移，需以「單一路徑」執行：
  1. 先將 `index.html` 改為 ESM 入口（或導入 bundler）。
  2. 再把核心依賴逐步改為 import。
  3. 最後移除 `window.KLaws*` global 匯出。
- 禁止雙軌並存（legacy + 未接線 ESM 草案）。
