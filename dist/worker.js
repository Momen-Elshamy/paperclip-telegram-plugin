// src/worker.ts
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";

// src/telegram.ts
async function sendTelegramMessage(botToken, chatId, text, parseMode = "HTML") {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body = {
    chat_id: chatId,
    text
  };
  if (parseMode) body.parse_mode = parseMode;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}
async function setWebhook(botToken, webhookUrl, secret) {
  const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
  const body = { url: webhookUrl };
  if (secret) body.secret_token = secret;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}
async function getBotInfo(botToken) {
  const url = `https://api.telegram.org/bot${botToken}/getMe`;
  const res = await fetch(url);
  return res.json();
}

// src/worker.ts
var STATE_CHAT_ID = "telegram-chat-id";
var STATE_ENABLED = "telegram-enabled";
var STATE_CHAT_MAPPING = "telegram-chat-agent-mapping";
var plugin = definePlugin({
  async setup(ctx2) {
    ctx2.logger.info("Telegram plugin starting up");
    ctx2.tools.register("send-telegram", {
      displayName: "Send Telegram Message",
      description: "Send a message to Momen on Telegram. Use this when you need human input, are blocked, completed a major task, or want to share an important update.",
      parametersSchema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The message to send. Be concise and clear. Include context about what you need or what happened."
          },
          urgent: {
            type: "boolean",
            description: "Set to true if this requires immediate attention (blocked, waiting for approval, critical error)."
          }
        },
        required: ["message"]
      }
    }, async (params, toolCtx) => {
      const { message, urgent } = params;
      const botToken = await ctx2.secrets.read("telegram-bot-token");
      if (!botToken) {
        return {
          content: "Telegram not configured: bot token missing.",
          data: { ok: false, error: "no_bot_token" }
        };
      }
      const agentId = toolCtx.agentId;
      const chatId = await ctx2.state.get({
        scopeKind: "agent",
        scopeId: agentId,
        stateKey: STATE_CHAT_ID
      });
      if (!chatId) {
        return {
          content: "Telegram not configured for this agent: no Chat ID set. Ask Momen to configure it at /ORGA/telegram.",
          data: { ok: false, error: "no_chat_id" }
        };
      }
      let agentName = "Agent";
      try {
        const agents = await ctx2.agents.list({ companyId: toolCtx.companyId });
        const agent = agents.find((a) => a.id === agentId);
        if (agent) agentName = agent.name;
      } catch {
      }
      const urgentPrefix = urgent ? "\u{1F6A8} " : "";
      const formattedMessage = `${urgentPrefix}\u{1F916} <b>${agentName}</b>

${message}`;
      const result = await sendTelegramMessage(botToken, chatId, formattedMessage);
      if (!result.ok) {
        return {
          content: `Failed to send Telegram message: ${result.description}`,
          data: { ok: false, error: result.description }
        };
      }
      return {
        content: `Telegram message sent to Momen successfully.`,
        data: { ok: true, messageId: result.result?.message_id }
      };
    });
    ctx2.events.on("agent.run.finished", async (event) => {
      const agentId = event.entityId;
      if (!agentId) return;
      const enabled = await ctx2.state.get({
        scopeKind: "agent",
        scopeId: agentId,
        stateKey: STATE_ENABLED
      });
      if (!enabled) return;
      const chatId = await ctx2.state.get({
        scopeKind: "agent",
        scopeId: agentId,
        stateKey: STATE_CHAT_ID
      });
      if (!chatId) return;
      const botToken = await ctx2.secrets.read("telegram-bot-token");
      if (!botToken) return;
      let agentName = "Agent";
      try {
        const agents = await ctx2.agents.list({ companyId: event.companyId });
        const agent = agents.find((a) => a.id === agentId);
        if (agent) agentName = agent.name;
      } catch {
      }
      const runData = event.data;
      const status = runData?.status;
      const summary = runData?.summary;
      const statusEmoji = status === "done" || status === "completed" ? "\u2705" : "\u274C";
      const message = [
        `\u{1F916} <b>${agentName}</b> run finished`,
        `Status: ${statusEmoji} ${status || "unknown"}`,
        summary ? `Summary: ${summary}` : null
      ].filter(Boolean).join("\n");
      try {
        await sendTelegramMessage(botToken, chatId, message);
      } catch (err) {
        ctx2.logger.error("Failed to send Telegram notification", { err });
      }
    });
    ctx2.data.register("agents-list", async ({ companyId }) => {
      if (!companyId) return [];
      try {
        const agents = await ctx2.agents.list({ companyId: String(companyId) });
        return agents.map((a) => ({
          id: a.id,
          name: a.name,
          role: a.role,
          status: a.status
        }));
      } catch {
        return [];
      }
    });
    ctx2.data.register("all-agent-configs", async ({ companyId }) => {
      if (!companyId) return {};
      try {
        const agents = await ctx2.agents.list({ companyId: String(companyId) });
        const result = {};
        for (const agent of agents) {
          const enabled = await ctx2.state.get({ scopeKind: "agent", scopeId: agent.id, stateKey: STATE_ENABLED });
          const chatId = await ctx2.state.get({ scopeKind: "agent", scopeId: agent.id, stateKey: STATE_CHAT_ID });
          const notifyOnComplete = await ctx2.state.get({ scopeKind: "agent", scopeId: agent.id, stateKey: "telegram-notify-complete" });
          const notifyOnFail = await ctx2.state.get({ scopeKind: "agent", scopeId: agent.id, stateKey: "telegram-notify-fail" });
          const notifyOnBlocked = await ctx2.state.get({ scopeKind: "agent", scopeId: agent.id, stateKey: "telegram-notify-blocked" });
          result[agent.id] = {
            enabled: !!enabled,
            chatId: chatId || null,
            notifyOnComplete: notifyOnComplete !== "0",
            notifyOnFail: notifyOnFail !== "0",
            notifyOnBlocked: notifyOnBlocked === "1"
          };
        }
        return result;
      } catch {
        return {};
      }
    });
    ctx2.data.register("agent-telegram-config", async ({ agentId }) => {
      if (!agentId) return { enabled: false, chatId: null };
      const enabled = await ctx2.state.get({ scopeKind: "agent", scopeId: String(agentId), stateKey: STATE_ENABLED });
      const chatId = await ctx2.state.get({ scopeKind: "agent", scopeId: String(agentId), stateKey: STATE_CHAT_ID });
      return { enabled: !!enabled, chatId: chatId || null };
    });
    ctx2.actions.register("save-agent-telegram-config", async (params) => {
      const { agentId, chatId, enabled, notifyOnComplete, notifyOnFail, notifyOnBlocked } = params;
      if (!agentId) throw new Error("agentId required");
      await ctx2.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: STATE_ENABLED }, enabled ? "1" : "");
      await ctx2.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: "telegram-notify-complete" }, notifyOnComplete ? "1" : "0");
      await ctx2.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: "telegram-notify-fail" }, notifyOnFail ? "1" : "0");
      await ctx2.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: "telegram-notify-blocked" }, notifyOnBlocked ? "1" : "0");
      if (chatId) {
        await ctx2.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: STATE_CHAT_ID }, chatId);
        await ctx2.state.set({ scopeKind: "instance", scopeId: "global", stateKey: `${STATE_CHAT_MAPPING}-${chatId}` }, agentId);
      }
      const companyIdParam = params.companyId;
      if (companyIdParam) {
        await ctx2.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: "telegram-company-id" }, companyIdParam);
      }
      return { ok: true };
    });
    ctx2.actions.register("send-test-message", async (params) => {
      const { chatId } = params;
      if (!chatId) throw new Error("chatId required");
      const botToken = await ctx2.secrets.read("telegram-bot-token");
      if (!botToken) throw new Error("Bot token not configured. Go to plugin settings.");
      const result = await sendTelegramMessage(
        botToken,
        chatId,
        "\u2705 <b>Paperclip connected!</b>\n\nTelegram notifications are working."
      );
      if (!result.ok) throw new Error(result.description || "Failed to send message");
      return { ok: true };
    });
    ctx2.actions.register("configure-webhook", async (params) => {
      const { paperclipUrl, pluginId } = params;
      const botToken = await ctx2.secrets.read("telegram-bot-token");
      if (!botToken) throw new Error("Bot token not configured");
      const webhookUrl = `${paperclipUrl}/api/plugins/${pluginId}/webhooks/telegram`;
      const result = await setWebhook(botToken, webhookUrl);
      if (!result.ok) throw new Error(result.description || "Failed to set webhook");
      return { ok: true, webhookUrl };
    });
    ctx2.actions.register("get-bot-info", async () => {
      const botToken = await ctx2.secrets.read("telegram-bot-token");
      if (!botToken) throw new Error("Bot token not configured");
      const result = await getBotInfo(botToken);
      if (!result.ok || !result.result) throw new Error("Failed to get bot info");
      return result.result;
    });
  },
  // ─── Health check ───
  async onHealth() {
    return { status: "ok" };
  },
  // ─── Config validation ───
  async onValidateConfig(config) {
    const c = config;
    if (!c.botToken) {
      return { ok: false, errors: ["botToken is required"] };
    }
    try {
      const result = await getBotInfo(c.botToken);
      if (!result.ok) {
        return { ok: false, errors: ["Invalid bot token \u2014 could not connect to Telegram"] };
      }
      return { ok: true, warnings: [`Connected as @${result.result?.username}`] };
    } catch (err) {
      return { ok: false, errors: [`Connection failed: ${err instanceof Error ? err.message : String(err)}`] };
    }
  },
  // ─── Config changed ───
  async onConfigChanged(newConfig) {
    const c = newConfig;
    if (c.botToken) {
    }
  },
  // ─── Webhook handler: incoming Telegram updates ───
  async onWebhook(input) {
    if (input.endpointKey !== "telegram") return { status: 200, body: { ok: true } };
    const update = input.body;
    if (!update.message?.text || !update.message?.chat?.id) {
      return { status: 200, body: { ok: true } };
    }
    const chatId = String(update.message.chat.id);
    const text = update.message.text;
    const fromName = update.message.from?.first_name || "Momen";
    ctx.logger.info("Telegram message received", { chatId, text: text.slice(0, 100) });
    const agentId = await ctx.state.get({
      scopeKind: "instance",
      scopeId: "global",
      stateKey: `${STATE_CHAT_MAPPING}-${chatId}`
    });
    if (!agentId) {
      ctx.logger.warn("No agent mapped to chat", { chatId });
      return { status: 200, body: { ok: true } };
    }
    await ctx.state.set(
      { scopeKind: "agent", scopeId: agentId, stateKey: "telegram-pending-message" },
      JSON.stringify({ chatId, text, fromName, timestamp: Date.now() })
    );
    try {
      const companyId = await ctx.state.get({
        scopeKind: "agent",
        scopeId: agentId,
        stateKey: "telegram-company-id"
      });
      if (companyId) {
        await ctx.agents.invoke(agentId, companyId, {
          wakeReason: "telegram_message",
          wakeContext: {
            telegramMessage: text,
            telegramFrom: fromName,
            telegramChatId: chatId
          }
        });
        ctx.logger.info("Agent woken via Telegram message", { agentId });
      }
    } catch (err) {
      ctx.logger.warn("Could not invoke agent directly, message stored in state", { agentId, err });
    }
    return { status: 200, body: { ok: true } };
  }
});
var worker_default = plugin;
runWorker(plugin, import.meta.url);
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
