import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  manifestVersion: 1,
  id: "telegram-notify",
  apiVersion: 1,
  pluginKey: "telegram-notify",
  displayName: "Telegram Notifications",
  description: "Send Telegram notifications from Paperclip agents. Configure which agents notify which Telegram chats.",
  version: "1.1.0",
  author: "Premast Lab",
  categories: ["connector"],
  capabilities: [
    "events.subscribe",
    "agents.read",
    "agents.invoke",
    "plugin.state.read",
    "plugin.state.write",
    "secrets.read-ref",
    "webhooks.receive",
    "http.outbound",
    "ui.page.register",
    "ui.sidebar.register",
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
      description: "Receives updates from Telegram",
    },
  ],
  ui: {
    slots: [
      {
        type: "page",
        id: "telegram-settings-page",
        displayName: "Telegram",
        exportName: "TelegramSettingsPage",
        routePath: "telegram",
      },
      {
        type: "sidebar",
        id: "telegram-sidebar-link",
        displayName: "Telegram",
        exportName: "TelegramSidebarLink",
      },
    ],
  },
  entrypoints: {
    worker: "dist/worker.js",
    ui: "dist/ui/",
  },
};

export default manifest;
