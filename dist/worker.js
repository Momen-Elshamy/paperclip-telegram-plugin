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
  async setup(ctx) {
    ctx.logger.info("Telegram plugin starting up");
    ctx.events.on("agent.run.finished", async (event) => {
      const agentId = event.entityId;
      if (!agentId) return;
      const enabled = await ctx.state.get({
        scopeKind: "agent",
        scopeId: agentId,
        stateKey: STATE_ENABLED
      });
      if (!enabled) return;
      const chatId = await ctx.state.get({
        scopeKind: "agent",
        scopeId: agentId,
        stateKey: STATE_CHAT_ID
      });
      if (!chatId) return;
      const botToken = await ctx.secrets.read("telegram-bot-token");
      if (!botToken) return;
      let agentName = "Agent";
      try {
        const agents = await ctx.agents.list({ companyId: event.companyId });
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
        ctx.logger.error("Failed to send Telegram notification", { err });
      }
    });
    ctx.data.register("agents-list", async ({ companyId }) => {
      if (!companyId) return [];
      try {
        const agents = await ctx.agents.list({ companyId: String(companyId) });
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
    ctx.data.register("all-agent-configs", async ({ companyId }) => {
      if (!companyId) return {};
      try {
        const agents = await ctx.agents.list({ companyId: String(companyId) });
        const result = {};
        for (const agent of agents) {
          const enabled = await ctx.state.get({ scopeKind: "agent", scopeId: agent.id, stateKey: STATE_ENABLED });
          const chatId = await ctx.state.get({ scopeKind: "agent", scopeId: agent.id, stateKey: STATE_CHAT_ID });
          const notifyOnComplete = await ctx.state.get({ scopeKind: "agent", scopeId: agent.id, stateKey: "telegram-notify-complete" });
          const notifyOnFail = await ctx.state.get({ scopeKind: "agent", scopeId: agent.id, stateKey: "telegram-notify-fail" });
          const notifyOnBlocked = await ctx.state.get({ scopeKind: "agent", scopeId: agent.id, stateKey: "telegram-notify-blocked" });
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
    ctx.data.register("agent-telegram-config", async ({ agentId }) => {
      if (!agentId) return { enabled: false, chatId: null };
      const enabled = await ctx.state.get({ scopeKind: "agent", scopeId: String(agentId), stateKey: STATE_ENABLED });
      const chatId = await ctx.state.get({ scopeKind: "agent", scopeId: String(agentId), stateKey: STATE_CHAT_ID });
      return { enabled: !!enabled, chatId: chatId || null };
    });
    ctx.actions.register("save-agent-telegram-config", async (params) => {
      const { agentId, chatId, enabled, notifyOnComplete, notifyOnFail, notifyOnBlocked } = params;
      if (!agentId) throw new Error("agentId required");
      await ctx.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: STATE_ENABLED }, enabled ? "1" : "");
      await ctx.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: "telegram-notify-complete" }, notifyOnComplete ? "1" : "0");
      await ctx.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: "telegram-notify-fail" }, notifyOnFail ? "1" : "0");
      await ctx.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: "telegram-notify-blocked" }, notifyOnBlocked ? "1" : "0");
      if (chatId) {
        await ctx.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: STATE_CHAT_ID }, chatId);
        await ctx.state.set({ scopeKind: "instance", scopeId: "global", stateKey: `${STATE_CHAT_MAPPING}-${chatId}` }, agentId);
      }
      return { ok: true };
    });
    ctx.actions.register("send-test-message", async (params) => {
      const { chatId } = params;
      if (!chatId) throw new Error("chatId required");
      const botToken = await ctx.secrets.read("telegram-bot-token");
      if (!botToken) throw new Error("Bot token not configured. Go to plugin settings.");
      const result = await sendTelegramMessage(
        botToken,
        chatId,
        "\u2705 <b>Paperclip connected!</b>\n\nTelegram notifications are working."
      );
      if (!result.ok) throw new Error(result.description || "Failed to send message");
      return { ok: true };
    });
    ctx.actions.register("configure-webhook", async (params) => {
      const { paperclipUrl, pluginId } = params;
      const botToken = await ctx.secrets.read("telegram-bot-token");
      if (!botToken) throw new Error("Bot token not configured");
      const webhookUrl = `${paperclipUrl}/api/plugins/${pluginId}/webhooks/telegram`;
      const result = await setWebhook(botToken, webhookUrl);
      if (!result.ok) throw new Error(result.description || "Failed to set webhook");
      return { ok: true, webhookUrl };
    });
    ctx.actions.register("get-bot-info", async () => {
      const botToken = await ctx.secrets.read("telegram-bot-token");
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
    const fromName = update.message.from?.first_name || "User";
    const agentId = await (async () => {
      try {
        const val = await plugin.__ctx?.state?.get({
          scopeKind: "instance",
          scopeId: "global",
          stateKey: `${STATE_CHAT_MAPPING}-${chatId}`
        });
        return val;
      } catch {
        return null;
      }
    })();
    if (!agentId) {
      return { status: 200, body: { ok: true } };
    }
    try {
      await plugin.__ctx?.state?.set(
        { scopeKind: "agent", scopeId: agentId, stateKey: "telegram-pending-message" },
        JSON.stringify({ chatId, text, fromName, timestamp: Date.now() })
      );
    } catch (err) {
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
