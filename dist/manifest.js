const manifest = {
  manifestVersion: 1,
  id: "telegram-notify",
  apiVersion: 1,
  pluginKey: "telegram-notify",
  displayName: "Telegram Notifications",
  description: "Send Telegram notifications from Paperclip agents and receive messages from Telegram to wake agents.",
  version: "1.0.0",
  author: "Premast Lab",
  categories: ["connector"],
  capabilities: [
    "events.subscribe",
    "agents.invoke",
    "plugin.state.read",
    "plugin.state.write",
    "secrets.read-ref",
    "webhooks.receive",
    "http.outbound",
    "ui.detailTab.register",
    "agents.read"
  ],
  instanceConfigSchema: {
    type: "object",
    properties: {
      botToken: {
        type: "string",
        description: "Telegram Bot Token (from @BotFather)"
      }
    },
    required: ["botToken"]
  },
  webhooks: [
    {
      endpointKey: "telegram",
      displayName: "Telegram Updates Webhook",
      description: "Receives updates from Telegram (messages, commands)"
    }
  ],
  ui: {
    slots: [
      {
        type: "detailTab",
        id: "telegram-agent-tab",
        displayName: "Telegram",
        exportName: "AgentTelegramTab",
        entityTypes: ["agent"]
      }
    ]
  },
  entrypoints: {
    worker: "dist/worker.js",
    ui: "dist/ui/"
  }
};
var manifest_default = manifest;
export {
  manifest_default as default
};
//# sourceMappingURL=manifest.js.map
