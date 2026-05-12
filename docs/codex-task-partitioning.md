# Codex Task Partitioning

本文件定義 Klaws 在多人/多代理並行開發時的固定分區（partition）規範，以降低 merge conflict 與跨模組耦合風險。

## 固定分區

- **Partition A（Core Data Layer）**
  - `data.js`
  - `storage.js`
  - `init.js`
- **Partition B（Logic/UI Layer）**
  - `level.js`
  - `map-logic.js`
  - `form.js`
- **Partition C（Tests Layer）**
  - `*.test.js`（可再依測試檔責任細分）

> 註：產品中的「任務功能」已移除；此處「任務」指開發任務單（PR）。

## 任務切分規則

1. **單一任務單（單一 PR）只能觸及單一 partition**。
2. 若需求跨 partition，**必須拆成多個 PR**。
3. 合併順序預設為：
   - 先合併底層分區（通常是 **Partition A**）
   - 再合併上層邏輯/UI 分區（通常是 **Partition B**）
4. 測試相關變更建議獨立在 **Partition C**，或至少在 PR 中清楚聲明其目的與風險。

## 分支與 PR 實務建議

- 分支命名建議帶上 partition 標記：
  - `feat/partition-a-...`
  - `fix/partition-b-...`
  - `test/partition-c-...`
- PR 描述需填寫 touched partition 與越界風險檢查（見 PR template）。

## 自動檢查策略

CI 會執行輕量腳本檢查：

- 若同一個 PR 同時修改多個 partition 的核心檔，會輸出 **warning**。
- 預設為 **non-blocking**（不阻擋合併），但會提示維護者與提交者重新檢視切分策略。
