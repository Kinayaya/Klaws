# Global API Runtime 盤點（klaws-core.js / state.js / init.js）

## 盤點範圍與結論
- 盤點起點：`klaws-core.js`、`state.js`、`init.js`。
- 目前 runtime 仍是 legacy script chain（非 ESM/bundler），因此允許少量必要 global。
- 本次已移除「僅歷史相容、無現行呼叫者」的 global bridge，並把 `KLawsCore` 依賴改為可注入/單一路徑解析。

## 仍保留的必要 global
1. `window.KLawsCore`
   - 來源：`klaws-core.js`。
   - 用途：legacy runtime 下，`state.js` 的 `mergeAuxNodesIntoNotes` 會以單一路徑 resolver（`globalThis.KLawsCore`）作為 fallback。
   - 備註：Node 測試環境可透過 CommonJS 或 `setKLawsCoreBridge` 注入替代。

2. `window.appState`
   - 來源：`state.js`。
   - 用途：`init.js`、`map-logic.js`、`calendar-logic.js` 目前皆以 `window.appState` 讀取並呼叫 state facade。
   - 備註：這是目前 runtime 唯一仍被其他腳本直接依賴的 state global。

## 可刪除 global（本次已處理）
1. `window.createAppState`
   - 狀態：已移除。
   - 理由：全專案無 runtime 呼叫者，僅造成雙軌入口（factory global + singleton global）與維護成本。

## `KLawsCore` 取得策略（避免隱式 global 依賴）
`state.js` 現在採用明確順序：
1. 呼叫 `mergeAuxNodesIntoNotes(..., { klawsCore })` 的顯式注入。
2. `setKLawsCoreBridge(core)` 設定的 bridge（可用於測試或初始化注入）。
3. `globalThis.KLawsCore`（legacy runtime fallback）。
4. 若以上都不存在，直接 throw，避免 silent failure。

## 後續守則（避免再走雙軌）
- 新功能不得再新增「無呼叫者」的 `window.*` 掛載。
- 若需跨檔共享，優先採：
  1. 顯式參數注入。
  2. 單一 facade（如 `window.appState`）且需有明確呼叫者。
- 任何新增 global 必須先更新此文件，並附上「呼叫者清單」。
