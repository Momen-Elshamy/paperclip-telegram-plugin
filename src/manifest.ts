import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  manifestVersion: 1,
  pluginKey: "telegram-notify",
  displayName: "Telegram Notifications",
  description:
    "Send Telegram notifications from Paperclip agents and receive messages from Telegram to wake agents.",
  version: "1.0.0",
  author: "Premast Lab",
  category: "notifications",
  capabilities: [
    "events.subscribe",
    "agents.invoke",
    "state.read",
    "state.write",
    "secrets.read",
    "secrets.write",
    "webhooks",
    "ui.slots",
  ],
  instanceConfigSchema: {
    type: "object",
    properties: {
      botToken: {
        type: "string",
        description: "Telegram Bot Token (from @BotFather)",
      },
    },
    required: ["botToken"],
  },
  webhooks: [
    {
      endpointKey: "telegram",
      displayName: "Telegram Updates Webhook",
      description: "Receives updates from Telegram (messages, commands)",
    },
  ],
  ui: {
    slots: [
      {
        slotType: "agent.settings.tab",
        tabLabel: "Telegram",
        componentKey: "AgentTelegramTab",
      },
    ],
  },
  entrypoints: {
    worker: "dist/worker.js",
    ui: "dist/ui/",
  },
};

export default manifest;
