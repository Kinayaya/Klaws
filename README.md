# Klaws

## Multi-agent parallel workflow

為了降低多人並行修改造成的衝突風險，請遵循以下工作流：

- 先閱讀分區規範：`docs/codex-task-partitioning.md`
- 每個任務單（PR）只處理單一 partition。
- 跨 partition 需求拆成多個 PR，先合併底層（通常 Partition A），再合併 UI/邏輯層（Partition B）。

### Branch naming 建議

- `feat/partition-a-<topic>`
- `fix/partition-b-<topic>`
- `test/partition-c-<topic>`

### Rebase / merge 順序範例

假設需求同時改到資料層與 UI：

1. 開 PR-1：`feat/partition-a-storage-refactor`（只改 `data.js` / `storage.js` / `init.js`）
2. PR-1 合併後，更新 UI 分支：
   - `git checkout feat/partition-b-form-update`
   - `git fetch origin`
   - `git rebase origin/main`
3. 開 PR-2：`feat/partition-b-form-update`（只改 `level.js` / `map-logic.js` / `form.js`）

這樣能讓衝突定位更精準，也更容易 rollback 與 code review。
