[English](README_en.md) | [简体中文](README_zh-cn.md) | [繁體中文](README_zh-tw.md)

# Gemini Telegram Worker Bot - 新手入门指南

本指南将引导你使用 Cloudflare Worker 设置一个由 Google Gemini API 驱动的 Telegram 机器人。 不需要任何编程经验，但对计算机和互联网的基本熟悉程度会有所帮助！

### 这是做什么用的？

这个机器人允许你：

*   直接从 Telegram 向强大的 Google Gemini AI 提问。
*   在私人聊天中使用它，或将其添加到群聊中以获得协作 AI 帮助。
*   管理员可以管理机器人的行为。

### 功能

*   **由 Gemini 驱动：** 连接到 Google Gemini API 以提供智能回复。
*   **Telegram 集成：** 在 Telegram 中无缝工作，响应你的命令。
*   **群聊就绪：** 将机器人添加到你的群聊中以获得共享的 AI 帮助。
*   **管理员控制：** 管理员可以使用命令来控制机器人：
    *   `/LLM on`：开启 AI (LLM)。
    *   `/LLM off`：关闭 AI (LLM)。
    *   `/LLM [temperature]`：调整 AI 的创造力（0-1，例如，`/LLM 0.5`）。 温度越高，AI 的创造力越高，但可能准确性较低。
    *   `/Model [模型名称]`：选择要使用的 Gemini 模型（仅限高级用户）。
    *   `/Test`： （仅限管理员）检查你的 API 密钥是否正常工作。
*   **多密钥支持：** 使用多个 Gemini API 密钥来提高可靠性 - 如果一个密钥失败，它会尝试另一个！
*   **MarkdownV2 格式：** 支持格式化的文本消息（如*粗体*、_斜体_和`代码`），以提高可读性。

### 前提条件 - 你需要什么

1.  **一个 Cloudflare 帐户：** 如果你还没有帐户，[请注册一个免费的 Cloudflare 帐户](https://dash.cloudflare.com)。 Cloudflare Workers 允许你运行代码而无需管理服务器。
2.  **一个 Telegram 帐户：** 你需要一个 Telegram 帐户才能创建和使用你的机器人。
3.  **一个 Telegram 机器人令牌：** 这就像你的机器人的密码。 [按照以下步骤创建 Telegram 机器人并获取其令牌](https://core.telegram.org/bots#6-botfather)。 你将与 BotFather 交互来执行此操作。
4.  **一个 Google Gemini API 密钥：** [从 Google AI Studio 获取一个或多个 API 密钥](https://ai.google.dev/gemini-api/docs)。 你可能需要一个 Google Cloud 帐户。
5.  **你的 Telegram 用户 ID：** 你需要这个才能成为机器人的管理员。 如果你计划在群组中使用此机器人，还需要群组 ID。

    * **如何使用 @MoeryIDBot 获取你的用户 ID 和群组 ID：**
        * 在 Telegram 上与 [@MoeryIDBot](https://t.me/MoeryIDBot) 开始聊天。
        * 只需输入 `/start` 并将其发送给机器人。 它将回复你的用户 ID。
        * 如果你在群组中，请将 @MoeryIDBot 添加到群组。
        * 在群组中发送 `/start`。 机器人将回复你的用户 ID 和群组 ID。
        * (可选) @MoeryIDBot 的源代码位于 `_IDBot.workers`。

### 逐步设置指南

1.  **创建一个 Cloudflare Worker：**
    *   登录到你的 [Cloudflare](https://dash.cloudflare.com) 帐户。
    *   点击左侧菜单中的“Workers & Pages”。
    *   点击“创建应用程序”按钮。
    *   选择“创建 Worker”并点击“部署”。
    *   给你的 Worker 命名（例如，“my-gemini-bot”）并设置一个子域名（它将类似于 `your-bot.your-username.workers.dev`）。

2.  **复制并粘贴代码：**
      - [worker.js](_worker.js) (Click here to see the Cloudflare Worker code)
    *   在文本编辑器（例如 Windows 上的记事本或 Mac 上的文本编辑）中打开 `worker.js` 文件。
    *   选择 `worker.js` 文件中的所有文本并复制它（Ctrl+A，Ctrl+C 或 Cmd+A，Cmd+C）。
    *   返回到你的 Cloudflare Worker 编辑器。
    *   选择编辑器中的所有现有文本并粘贴你复制的代码（Ctrl+A，Ctrl+V 或 Cmd+A，Cmd+V）。

3.  **配置环境变量（重要！）**
    *   在 Cloudflare Worker 编辑器中，找到这些行：
        ```javascript
        const BOT_TOKEN = ""; // Telegram Bot Token
        const GEMINI_API_KEYS = ""; // Gemini API Keys, separated by commas
        const ADMIN_ID = 0; // Telegram Admin User ID
        const LOG_STATUS = "disable"; // Enable or disable logging, "enable" or "disable"
        const LOG_GROUP_ID = 0; // Telegram Group ID for logs
        ```
    *   将空字符串 `""` 和 `0` 替换为你的实际值：
        *   `BOT_TOKEN`：将你的 Telegram 机器人令牌粘贴在引号之间（例如，`const BOT_TOKEN = "123456:ABC-DEF1234ghiJklmNoPqRsTuvWxYz";`）。
        *   `GEMINI_API_KEYS`：粘贴你的 Gemini API 密钥，如果你有多个密钥，请用逗号分隔它们（例如，`const GEMINI_API_KEYS = "AIzaSy... , AIzaQy...";`）。 确保逗号后*没有*额外的空格。
        *   `ADMIN_ID`：输入你的 Telegram 用户 ID（例如，`const ADMIN_ID = 123456789;`）。
        *   `LOG_STATUS`：此设置控制机器人是否将日志发送到 Telegram 群组。 默认情况下，它设置为 `"disable"`。 要启用日志记录，请将其更改为 `"enable"` 并设置 `LOG_GROUP_ID`。 **重要提示：在启用日志记录之前，请考虑隐私影响。**
        *   `LOG_GROUP_ID`：如果启用日志记录，你需要提供要将日志发送到的 Telegram 群组的群组 ID。 使用 [@MoeryIDBot](https://t.me/MoeryIDBot) 查找你的群组 ID，如上所述。

4.  **设置 Telegram Webhook：**
    *   打开你的 Web 浏览器。
    *   将以下 URL 复制并粘贴到地址栏中，但**将**占位符替换为你的实际值：

        `https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/setWebhook?url=YOUR_WORKER_URL`
    *   **重要提示：**
        *   将 `YOUR_TELEGRAM_BOT_TOKEN` 替换为你的 Telegram 机器人令牌。
        *   将 `YOUR_WORKER_URL` 替换为你的 Cloudflare Worker URL（创建 Worker 时看到的那个，例如 `your-bot.your-username.workers.dev`）。
    *   按 Enter 键。 如果成功，你将看到类似 `{"ok":true,"result":true,"description":"Webhook was set"}` 的消息。 如果你看到错误，请仔细检查你的机器人令牌和 Worker URL。

5.  **部署 Worker：**
    *   在 Cloudflare Worker 编辑器中，点击“保存并部署”按钮。

### 使用你的机器人

1.  通过搜索其用户名（使用 BotFather 创建机器人时设置的那个）在 Telegram 上找到你的机器人。
2.  与你的机器人开始聊天。
3.  输入 `/start` 并将其发送给机器人。 你应该会看到欢迎消息。
4.  通过输入你的问题并发送给机器人来向机器人提问。
5.  在群聊中，使用 `/Gemini` 命令，后跟你的问题（例如，`/Gemini 法国的首都是什么？`）。
6.  如果你是管理员（你将你的 Telegram 用户 ID 设置为 `ADMIN_ID`），你可以使用管理命令来控制机器人。

### 日志记录

机器人可以将日志发送到 Telegram 群组，这有助于调试和监视其活动。

*   **`LOG_STATUS`：** 设置为 `"enable"` 以启用日志记录，或设置为 `"disable"` 以关闭日志记录（默认值：`"disable"`）。
*   **`LOG_GROUP_ID`：** 如果启用日志记录，请将其设置为要将日志发送到的 Telegram 群组的群组 ID。 使用 [@MoeryIDBot](https://t.me/MoeryIDBot) 查找你的群组 ID。

**重要提示：在启用日志记录之前，请注意机器人会将有关用户互动的信息（包括提出的问题）发送到日志记录群组。 在启用此功能之前，请考虑隐私影响。**

### 高级技巧

*   **自定义机器人：** 编辑 `worker.js` 文件以更改机器人的行为、欢迎消息等。
*   **学习 JavaScript：** Cloudflare Workers 使用 JavaScript。 学习 JavaScript 将使你能够进一步自定义你的机器人。

祝你玩得开心！
