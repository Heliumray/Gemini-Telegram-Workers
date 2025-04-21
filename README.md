# Gemini Telegram Worker Bot

## English

This is a simple [Cloudflare](https://dash.cloudflare.com) Worker script that connects to the [Google Gemini API](https://ai.google.dev/gemini-api/docs) and allows you to interact with it through a Telegram bot.

### Features

*   Connects to the Gemini API.
*   Responds to `/Gemini` commands in group chats and direct messages.
*   Supports multiple Gemini API keys for increased reliability.
*   Allows an administrator to control the bot's behavior with commands:
    *   `/LLM on`: Enables the LLM.
    *   `/LLM off`: Disables the LLM.
    *   `/LLM [temperature]`: Sets the LLM temperature (0-1).
    *   `/Model [model name]`: Switches to the specified model.
    *   `/Test`: (Admin only) Checks the status of all API keys.
*   Maintains conversation context for more natural interactions.
*   Supports MarkdownV2 formatting for richer text messages.

### Prerequisites

*   A [Cloudflare](https://dash.cloudflare.com) account.
*   A [Telegram](https://telegram.org/) bot token.
*   One or more [Google Gemini API keys](https://ai.google.dev/gemini-api/docs).

### Setup

1.  **Create a Cloudflare Worker:**
    *   Log in to your [Cloudflare](https://dash.cloudflare.com) account.
    *   Go to the Workers section.
    *   Create a new Worker.
2.  **Copy and Paste the Code:**
    *   Copy the contents of `worker.js` into the Worker editor.
3.  **Configure the Environment Variables:**
    *   Replace the following placeholders in the code with your actual values:
        *   `TELEGRAM_BOT_TOKEN`: Your Telegram bot token.
        *   `GEMINI_API_KEYS`: Your Gemini API keys, separated by commas (e.g., "KEY1,KEY2").
        *   `ADMIN_ID`: Your Telegram user ID.
4.  **Set the Telegram Webhook:**
    *   Use the following URL to set the webhook for your Telegram bot:
        `https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/setWebhook?url=YOUR_WORKER_URL`
        Replace `YOUR_TELEGRAM_BOT_TOKEN` with your bot token and `YOUR_WORKER_URL` with your Cloudflare Worker URL.
5.  **Deploy the Worker.**

### Usage

*   Start a conversation with the bot on Telegram or add it to a group.
*   Use the `/Gemini` command in a group chat or send a direct message to ask a question.
*   The administrator can use the control commands listed above.

## 中文

这是一个简单的 [Cloudflare](https://dash.cloudflare.com) Worker 脚本，连接到 [Google Gemini API](https://ai.google.dev/gemini-api/docs)，并允许你通过 Telegram 机器人与之交互。

### 功能

*   连接到 Gemini API。
*   响应群聊和私聊中的 `/Gemini` 命令。
*   支持多个 Gemini API 密钥，以提高可靠性。
*   允许管理员使用命令控制机器人的行为：
    *   `/LLM on`: 启用 LLM。
    *   `/LLM off`: 禁用 LLM。
    *   `/LLM [温度]`: 设置 LLM 温度 (0-1)。
    *   `/Model [模型名称]`: 切换到指定的模型。
    *   `/Test`: (仅限管理员) 检查所有 API 密钥的状态。
*   维护对话上下文，以实现更自然的交互。
*   支持 MarkdownV2 格式，以获得更丰富的文本消息。

### 前提条件

*   一个 [Cloudflare](https://dash.cloudflare.com) 账户。
*   一个 [Telegram](https://telegram.org/) 机器人令牌。
*   一个或多个 [Google Gemini API 密钥](https://ai.google.dev/gemini-api/docs)。

### 安装

1.  **创建一个 Cloudflare Worker:**
    *   登录到你的 [Cloudflare](https://dash.cloudflare.com) 账户。
    *   转到 Workers 部分。
    *   创建一个新的 Worker。
2.  **复制并粘贴代码:**
    *   将 `worker.js` 的内容复制到 Worker 编辑器中。
3.  **配置环境变量:**
    *   将代码中的以下占位符替换为你的实际值：
        *   `TELEGRAM_BOT_TOKEN`: 你的 Telegram 机器人令牌。
        *   `GEMINI_API_KEYS`: 你的 Gemini API 密钥，用逗号分隔 (例如, "KEY1,KEY2")。
        *   `ADMIN_ID`: 你的 Telegram 用户 ID。
4.  **设置 Telegram Webhook:**
    *   使用以下 URL 为你的 Telegram 机器人设置 webhook：
        `https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/setWebhook?url=YOUR_WORKER_URL`
        将 `YOUR_TELEGRAM_BOT_TOKEN` 替换为你的机器人令牌，并将 `YOUR_WORKER_URL` 替换为你的 Cloudflare Worker URL。
5.  **部署 Worker。**

### 用法

*   在 Telegram 上与机器人开始对话，或将其添加到群组。
*   在群聊中使用 `/Gemini` 命令或发送直接消息来提问。
*   管理员可以使用上面列出的控制命令。
