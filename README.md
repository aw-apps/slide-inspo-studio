# Slide Inspo Studio

一個可在 GitHub Pages 直接運行的「簡報設計靈感 + PPTX 編輯器」產品。

> 目標：
> - 靈感牆：收集/標註/搜尋設計參考
> - 編輯器：類似 Google Slides 的投影片編輯體驗（母片/版面配置/元素/樣式）
> - PPTX：完整匯入/匯出（以可擴充為原則，先打通主流程）
> - AI 匯出：把母片/版面/文字/圖片等匯出為可重複使用的結構化格式，利於後續接 AI 自動排版/填字

## MVP 與正式產品策略（重要）

你要求的是「正式產品」而非單純 MVP；但仍會用**分階段里程碑**確保每一階段都能在 Pages 上可用、可回歸測試、可逐步補齊 PPTX 功能。

核心原則：
- 純前端：GitHub Pages 靜態部署
- 單一資料模型：編輯器內部格式（JSON）為唯一真相
- 匯入/匯出：PPTX <-> 內部 JSON 轉換器（逐步支援）
- 可移植：零或極少依賴（如需依賴，先鎖定版本並加上離線可用策略）

## 開發

- 直接開啟 `index.html` 可跑（或用任意靜態伺服器）。

## Roadmap

請到 GitHub Issues 追蹤：每個 issue 都附 Objective/Approach/Acceptance Criteria。
