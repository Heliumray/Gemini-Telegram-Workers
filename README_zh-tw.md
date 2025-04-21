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
5.  **您的 Telegram 使用者 ID：** 您需要這個才能成為機器人的管理員。 使用 [@userinfobot](https://t.me/userinfobot) 機器人來尋找您的 Telegram 使用者 ID。 只需與它開始聊天，它就會告訴您您的 ID。

### 逐步設定指南

1.  **建立一個 Cloudflare Worker：**
    *   登入到您的 [Cloudflare](https://dash.cloudflare.com) 帳戶。
    *   點擊左側選單中的「Workers & Pages」。
    *   點擊「建立應用程式」按鈕。
    *   選擇「建立 Worker」並點擊「部署」。
    *   給您的 Worker 命名（例如，「my-gemini-bot」）並設定一個子網域（它將類似於 `your-bot.your-username.workers.dev`）。

2.  **複製並貼上程式碼：**
      - [worker.js](_worker.js) (Click here to see the Cloudflare Worker code)
    *   在文字編輯器（例如 Windows 上的記事本或 Mac 上的文字編輯）中開啟 `worker.js` 檔案。
    *   選擇 `worker.js` 檔案中的所有文字並複製它 (Ctrl+A, Ctrl+C 或 Cmd+A, Cmd+C)。
    *   返回到您的 Cloudflare Worker 編輯器。
    *   選擇編輯器中的所有現有文字並貼上您複製的程式碼 (Ctrl+A, Ctrl+V 或 Cmd+A, Cmd+V)。

3.  **設定環境變數（重要！）**
    *   在 Cloudflare Worker 編輯器中，找到這些行：
        ```javascript
        const BOT_TOKEN = ""; // Telegram Bot Token
        const GEMINI_API_KEYS = ""; // Gemini API Keys, separated by commas
        const ADMIN_ID = 0; // Telegram Admin User ID
        ```
    *   將空字串 `""` 和 `0` 替換為您的實際值：
        *   `BOT_TOKEN`：將您的 Telegram 機器人權杖貼在引號之間（例如，`const BOT_TOKEN = "123456:ABC-DEF1234ghiJklmNoPqRsTuvWxYz";`）。
        *   `GEMINI_API_KEYS`：貼上您的 Gemini API 金鑰，如果您有多個金鑰，請用逗號分隔它們（例如，`const GEMINI_API_KEYS = "AIzaSy... , AIzaQy...";`）。 確保逗號後*沒有*額外的空格。
        *   `ADMIN_ID`：輸入您的 Telegram 使用者 ID（例如，`const ADMIN_ID = 123456789;`）。

4.  **設定 Telegram Webhook：**
    *   開啟您的 Web 瀏覽器。
    *   將以下 URL 複製並貼到網址列中，但**將**佔位符替換為您的實際值：

        `https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/setWebhook?url=YOUR_WORKER_URL`
    *   **重要提示：**
        *   將 `YOUR_TELEGRAM_BOT_TOKEN` 替換為您的 Telegram 機器人權杖。
        *   將 `YOUR_WORKER_URL` 替換為您的 Cloudflare Worker URL（建立 Worker 時看到的那個，例如 `your-bot.your-username.workers.dev`）。
    *   按 Enter 鍵。 如果成功，您將看到類似 `{"ok":true,"result":true,"description":"Webhook was set"}` 的訊息。 如果您看到錯誤，請仔細檢查您的機器人權杖和 Worker URL。

5.  **部署 Worker：**
    *   在 Cloudflare Worker 編輯器中，點擊「儲存並部署」按鈕。

### 使用您的機器人

1.  通過搜尋其使用者名稱（使用 BotFather 建立機器人時設定的那個）在 Telegram 上找到您的機器人。
2.  與您的機器人開始聊天。
3.  輸入 `/start` 並將其傳送給機器人。 您應該會看到歡迎訊息。
4.  通過輸入您的問題並傳送給機器人來向機器人提問。
5.  在群聊中，使用 `/Gemini` 指令，後跟您的問題（例如，`/Gemini 法國的首都是什麼？`）。
6.  如果您是管理員（您將您的 Telegram 使用者 ID 設定為 `ADMIN_ID`），您可以使用管理指令來控制機器人。

### 疑難排解

*   **機器人沒有回應：**
    *   仔細檢查 Webhook 中的機器人權杖和 Worker URL。
    *   確保您的 Cloudflare Worker 已部署。
    *   檢查 Cloudflare Worker 日誌中的錯誤（在 Cloudflare 儀表板中）。
     *  確保 LLM 處於啟用狀態（如果停用，機器人將不回應）。
*   **「無效 API 金鑰」錯誤：**
    *   確保您的 Gemini API 金鑰正確，並且您已在 Google AI Studio 中啟用 Gemini API。
    *   如果您使用多個金鑰，請確保它們用逗號分隔，且沒有額外的空格。

### 進階技巧

*   **自訂機器人：** 編輯 `worker.js` 檔案以變更機器人的行為、歡迎訊息等。
*   **學習 JavaScript：** Cloudflare Workers 使用 JavaScript。 學習 JavaScript 將使您能夠進一步自訂您的機器人。

祝您玩得開心！
