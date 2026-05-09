# Global API 淘汰里程碑

## 目標
逐步將 `window.KLaws*` 轉為 ESM import 為主，保留過渡期相容層。

## 目前狀態（Phase 1）
- 已建立 ESM 模組：
  - `modules/calendar.js`
  - `modules/map.js`
  - `modules/render.js`
- 已建立相容橋接：`modules/compat-global.js`，統一掛回：
  - `window.KLawsCalendar`
  - `window.KLawsMap`
  - `window.KLawsRender`
- 舊版 `calendar.js` / `map.js` / `render.js` 仍保留 global export，避免一次性破壞。

## 里程碑
1. **Phase 2（內部新檔案）**
   - 新增/重構中的內部檔案禁止新增對 `window.KLaws*` 的直接依賴。
   - 以 ESM import 優先，必要時才由 compat bridge 讀取。
2. **Phase 3（既有核心模組）**
   - 將 `config.js` / `render-ui.js` 等核心檔案改為 ESM import。
   - 保持 HTML 載入順序相容，並驗證無回歸。
3. **Phase 4（移除 global）**
   - 完成所有內部引用切換後，移除舊 global-only 腳本。
   - 將 `modules/compat-global.js` 限縮為僅供外部整合或完全移除。

## 禁用策略
- 即日起：新程式碼不得新增 `window.KLaws*` 直接讀取（測試 stub 例外）。
- 既有程式碼採遞進替換，避免一次性大改造成風險。
