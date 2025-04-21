[English](README_en.md) | [简体中文](README_zh-cn.md) | [繁體中文](README_zh-tw.md)

# Gemini Telegram Worker Bot - 新手入門指南

本指南將引導您使用 Cloudflare Worker 設置一個由 Google Gemini API 驅動的 Telegram 機器人。 不需要任何程式設計經驗，但對電腦和網際網路的基本熟悉程度會有幫助！

### 這是做什麼用的？

這個機器人允許您：

*   直接從 Telegram 向強大的 Google Gemini AI 提問。
*   在私人聊天中使用它，或將其新增至群聊中以獲得協作 AI 幫助。
*   管理員可以管理機器人的行為。

### 功能

*   **由 Gemini 驅動：** 連接到 Google Gemini API 以提供智慧回覆。
*   **Telegram 整合：** 在 Telegram 中無縫工作，回應您的指令。
*   **群聊就緒：** 將機器人新增至您的群聊中以獲得共享的 AI 幫助。
*   **管理員控制：** 管理員可以使用指令來控制機器人：
    *   `/LLM on`：開啟 AI (LLM)。
    *   `/LLM off`：關閉 AI (LLM)。
    *   `/LLM [temperature]`：調整 AI 的創造力（0-1，例如，`/LLM 0.5`）。 溫度越高，AI 的創造力越高，但可能準確性較低。
    *   `/Model [模型名稱]`：選擇要使用的 Gemini 模型（僅限進階使用者）。
    *   `/Test`： （僅限管理員）檢查您的 API 金鑰是否正常工作。
*   **多金鑰支援：** 使用多個 Gemini API 金鑰來提高可靠性 - 如果一個金鑰失敗，它會嘗試另一個！
*   **MarkdownV2 格式：** 支援格式化的文字訊息（如*粗體*、_斜體_和`程式碼`），以提高可讀性。

### 前提條件 - 您需要什麼

1.  **一個 Cloudflare 帳戶：** 如果您還沒有帳戶，[請註冊一個免費的 Cloudflare 帳戶](https://dash.cloudflare.com)。 Cloudflare Workers 允許您執行程式碼而無需管理伺服器。
2.  **一個 Telegram 帳戶：** 您需要一個 Telegram 帳戶才能建立和使用您的機器人。
3.  **一個 Telegram 機器人權杖：** 這就像您的機器人的密碼。 [按照以下步驟建立 Telegram 機器人並取得其權杖](https://core.telegram.org/bots#6-botfather)。 您將與 BotFather 互動來執行此操作。
4.  **一個 Google Gemini API 金鑰：** [從 Google AI Studio 取得一個或多個 API 金鑰](https://ai.google.dev/gemini-api/docs)。 您可能需要一個 Google Cloud 帳戶。
5.  **您的 Telegram 使用者 ID：** 您需要這個才能成為機器人的管理員。 如果您計劃在群組中使用此機器人，
