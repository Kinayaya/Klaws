# state.js 全域 `let` 讀寫使用矩陣（精簡版）

| 欄位 | 寫入來源 | 讀取來源 | 影響 render | 影響持久化 |
|---|---|---|---|---|
| `mapResizeObserver` | `init.js` 建立 `ResizeObserver` 指派 | 無讀取 | 否（僅 side-effect） | 否 |
| `examSec` | `exam.js` `closeExamView()` 重設 `0` | 無讀取 | 否 | 否 |
| `examTotal` | `exam.js` `closeExamView()` 重設 `0` | 無讀取 | 否 | 否 |
| `cloudSyncEnabled` | `state.js` 初始化、`data.js` 切換 | `data.js` 同步流程與狀態文字 | 是（同步狀態文字） | 是（`CLOUD_SYNC_ENABLED_KEY`） |
| `focusTimerRemainingSec` | `state.js` 初始化、`utils-app.js` 重設/倒數 | `utils-app.js` 顯示時間/控制流程 | 是（計時 UI） | 否 |
| `mapFilter` | `state.js`/`init.js`/`appState` 更新 | `map-logic.js`/`utils-app.js`/`calendar-logic.js` | 是（Map 篩選） | 是（payload） |

## 判定與清理

- 已移除 `mapResizeObserver`、`examSec`、`examTotal`：皆無活躍讀取路徑，僅保留歷史殘留寫入。
- `cloudSyncEnabled`、`focusTimer*`、`map*` 主流程仍有 UI 入口與實際讀寫，不移除。
