[English](README.md) | [简体中文](README_zh-cn.md) | [繁體中文](README_zh-tw.md)

# Gemini Telegram Worker Bot - A Beginner's Guide

This guide will walk you through setting up a Telegram bot powered by the Google Gemini API using a Cloudflare Worker. No prior coding experience is required, but basic familiarity with computers and the internet is helpful!

### What is this for?

This bot allows you to:

*   Ask questions to the powerful Google Gemini AI directly from Telegram.
*   Use it in private chats or add it to group chats for collaborative AI assistance.
*   Administrators can manage the bot's behavior.

### Features

*   **Powered by Gemini:**  Connects to the Google Gemini API to provide intelligent responses.
*   **Telegram Integration:** Works seamlessly within Telegram, responding to your commands.
*   **Group Chat Ready:**  Add the bot to your group chats for shared AI assistance.
*   **Admin Controls:**  Administrators can use commands to control the bot:
    *   `/LLM on`: Turns the AI (LLM) on.
    *   `/LLM off`: Turns the AI (LLM) off.
    *   `/LLM [temperature]`: Adjusts the AI's creativity (0-1, e.g., `/LLM 0.5`). A higher temperature makes the AI more creative, but potentially less accurate.
    *   `/Model [model name]`: Chooses which Gemini model to use (advanced users only).
    *   `/Test`: (Admin only) Checks if your API keys are working correctly.
*   **Multi-Key Support:** Uses multiple Gemini API keys for reliability – if one fails, it tries another!
*   **MarkdownV2 Formatting:**  Supports formatted text messages (like *bold*, _italics_, and `code`) for better readability.

### Prerequisites - What You'll Need

1.  **A Cloudflare Account:**  [Sign up for a free Cloudflare account](https://dash.cloudflare.com) if you don't have one already.  Cloudflare Workers allow you to run code without managing servers.
2.  **A Telegram Account:** You'll need a Telegram account to create and use your bot.
3.  **A Telegram Bot Token:** This is like a password for your bot.  [Follow these steps to create a Telegram bot and get its token](https://core.telegram.org/bots#6-botfather).  You'll interact with BotFather to do this.
4.  **A Google Gemini API Key:**  [Get one or more API keys from Google AI Studio](https://ai.google.dev/gemini-api/docs). You might need a Google Cloud account.
5.  **Your Telegram User ID:**  You'll need this to become the bot's administrator.  Use the [@userinfobot](https://t.me/userinfobot) bot to find your Telegram User ID. Just start a chat with it and it will tell you your ID.

### Step-by-Step Setup Guide

1.  **Create a Cloudflare Worker:**
    *   Log in to your [Cloudflare](https://dash.cloudflare.com) account.
    *   Click on "Workers & Pages" in the left-hand menu.
    *   Click the "Create application" button.
    *   Choose "Create Worker" and click "Deploy".
    *   Give your Worker a name (e.g., "my-gemini-bot") and a subdomain (it will be something like `your-bot.your-username.workers.dev`).

2.  **Copy and Paste the Code:**
    *  [worker.js](_worker.js) (Click here to see the Cloudflare Worker code)
    *   Open the `worker.js` file in a text editor (like Notepad on Windows or TextEdit on Mac).
    *   Select all the text in the `worker.js` file and copy it (Ctrl+A, Ctrl+C or Cmd+A, Cmd+C).
    *   Go back to your Cloudflare Worker editor.
    *   Select all the existing text in the editor and paste the code you copied (Ctrl+A, Ctrl+V or Cmd+A, Cmd+V).

3.  **Configure the Environment Variables (Important!)**
    *   In the Cloudflare Worker editor, look for these lines:
        ```javascript
        const BOT_TOKEN = ""; // Telegram Bot Token
        const GEMINI_API_KEYS = ""; // Gemini API Keys, separated by commas
        const ADMIN_ID = 0; // Telegram Admin User ID
        ```
    *   Replace the empty strings `""` and `0` with your actual values:
        *   `BOT_TOKEN`:  Paste your Telegram bot token between the quotes (e.g., `const BOT_TOKEN = "123456:ABC-DEF1234ghiJklmNoPqRsTuvWxYz";`).
        *   `GEMINI_API_KEYS`: Paste your Gemini API keys, separated by commas if you have more than one (e.g., `const GEMINI_API_KEYS = "AIzaSy... , AIzaQy...";`).  Make sure there are *no* extra spaces after the commas.
        *   `ADMIN_ID`:  Enter your Telegram User ID (e.g., `const ADMIN_ID = 123456789;`).

4.  **Set the Telegram Webhook:**
    *   Open your web browser.
    *   Copy and paste the following URL into the address bar, but **replace** the placeholders with your actual values:

        `https://api.telegram.org/botYOUR_TELEGRAM_BOT_TOKEN/setWebhook?url=YOUR_WORKER_URL`
    *   **Important:**
        *   Replace `YOUR_TELEGRAM_BOT_TOKEN` with your Telegram bot token.
        *   Replace `YOUR_WORKER_URL` with your Cloudflare Worker URL (the one you saw when you created the Worker, like `your-bot.your-username.workers.dev`).
    *   Press Enter.  You should see a message like `{"ok":true,"result":true,"description":"Webhook was set"}` if it worked.  If you see an error, double-check your bot token and Worker URL.

5.  **Deploy the Worker:**
    *   In the Cloudflare Worker editor, click the "Save and deploy" button.

### Using Your Bot

1.  Find your bot on Telegram by searching for its username (the one you set when you created the bot with BotFather).
2.  Start a chat with your bot.
3.  Type `/start` and send it to the bot. You should see the welcome message.
4.  Ask the bot a question by typing your question and sending it.
5.  In group chats, use the `/Gemini` command followed by your question (e.g., `/Gemini What is the capital of France?`).
6.  If you are the administrator (you set your Telegram User ID as the `ADMIN_ID`), you can use the admin commands to control the bot.

### Troubleshooting

*   **Bot doesn't respond:**
    *   Double-check your bot token and Worker URL in the webhook.
    *   Make sure your Cloudflare Worker is deployed.
    *   Check the Cloudflare Worker logs for errors (in the Cloudflare dashboard).
    *   Make sure the LLM is enabled (if disabled the bot will not respond).
*   **"Invalid API Key" error:**
    *   Make sure your Gemini API key is correct and that you've enabled the Gemini API in Google AI Studio.
    *   If you're using multiple keys, make sure they are separated by commas without extra spaces.

### Advanced Tips

*   **Customize the bot:**  Edit the `worker.js` file to change the bot's behavior, welcome message, and more.
*   
