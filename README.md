# Paperclip Telegram Plugin

Connect your Paperclip agents to Telegram. Agents send notifications when runs finish, and you can message them directly via Telegram.

## Features

- 🔔 **Run notifications** — get a Telegram message whenever an agent run completes (success or failure)
- 💬 **Per-agent settings tab** — each agent has a "Telegram" tab in its settings to configure Chat ID and enable/disable
- 🔗 **Webhook support** — incoming Telegram messages wake the mapped agent
- 🧪 **Test connection** button to verify setup

## Installation

### 1. Install on your Paperclip instance

```bash
paperclipai plugin install paperclip-telegram-plugin
# or from GitHub:
paperclipai plugin install github:Momen-Elshamy/paperclip-telegram-plugin
```

### 2. Create a Telegram Bot

1. Open Telegram and chat with [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the instructions
3. Copy the **Bot Token** (looks like `123456789:ABCdef...`)

### 3. Configure the Plugin

In Paperclip UI:
1. Go to **Settings → Plugins → Telegram Notifications**
2. Paste your Bot Token
3. Click **Test Connection** to verify

### 4. Configure Each Agent

1. Open any agent in Paperclip
2. Go to the **Telegram** tab in agent settings
3. Check "Enable Telegram notifications"
4. Enter your **Chat ID** (send a message to [@userinfobot](https://t.me/userinfobot) to find yours)
5. Click **Save**, then **Send Test Message**

### 5. Set Up Webhook (for receiving messages)

After installing, configure the Telegram webhook to point to your Paperclip instance:

```bash
curl -X POST https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://paperclip.premastlab.com/api/plugins/telegram-notify/webhooks/telegram"}'
```

Or use the `configure-webhook` action from the plugin.

## How It Works

```
Agent run finishes
        ↓
Plugin receives "agent.run.finished" event
        ↓
Checks if Telegram is enabled for this agent
        ↓
Sends notification to configured Chat ID

Telegram message arrives
        ↓
Webhook endpoint receives update
        ↓
Looks up which agent is mapped to this chat ID
        ↓
Stores message in agent state for next heartbeat
```

## Development

```bash
npm install
npm run build
```

## License

MIT
