import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import {
  sendTelegramMessage,
  setWebhook,
  getBotInfo,
  type TelegramUpdate,
} from "./telegram.js";

// State keys
const STATE_CHAT_ID = "telegram-chat-id";
const STATE_ENABLED = "telegram-enabled";
const STATE_CHAT_MAPPING = "telegram-chat-agent-mapping"; // maps chatId -> agentId

const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info("Telegram plugin starting up");

    // ─── Event: agent run finished → send Telegram notification ───
    ctx.events.on("agent.run.finished", async (event) => {
      const agentId = event.entityId;
      if (!agentId) return;

      // Check if this agent has Telegram enabled
      const enabled = await ctx.state.get({
        scopeKind: "agent",
        scopeId: agentId,
        stateKey: STATE_ENABLED,
      });
      if (!enabled) return;

      const chatId = await ctx.state.get({
        scopeKind: "agent",
        scopeId: agentId,
        stateKey: STATE_CHAT_ID,
      });
      if (!chatId) return;

      const botToken = await ctx.secrets.read("telegram-bot-token");
      if (!botToken) return;

      // Get agent info for the message
      let agentName = "Agent";
      try {
        const agents = await ctx.agents.list({ companyId: event.companyId });
        const agent = agents.find((a: { id: string; name: string }) => a.id === agentId);
        if (agent) agentName = agent.name;
      } catch {
        // ignore
      }

      const runData = event.data as Record<string, unknown> | undefined;
      const status = runData?.status as string | undefined;
      const summary = runData?.summary as string | undefined;

      const statusEmoji = status === "done" || status === "completed" ? "✅" : "❌";
      const message = [
        `🤖 <b>${agentName}</b> run finished`,
        `Status: ${statusEmoji} ${status || "unknown"}`,
        summary ? `Summary: ${summary}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      try {
        await sendTelegramMessage(botToken, chatId as string, message);
      } catch (err) {
        ctx.logger.error("Failed to send Telegram notification", { err });
      }
    });

    // ─── Data endpoint: get agent Telegram config (used by UI) ───
    ctx.data.register("agent-telegram-config", async ({ agentId }) => {
      if (!agentId) return { enabled: false, chatId: null };
      const enabled = await ctx.state.get({ scopeKind: "agent", scopeId: String(agentId), stateKey: STATE_ENABLED });
      const chatId = await ctx.state.get({ scopeKind: "agent", scopeId: String(agentId), stateKey: STATE_CHAT_ID });
      return { enabled: !!enabled, chatId: chatId || null };
    });

    // ─── Action: save agent Telegram config (used by UI) ───
    ctx.actions.register("save-agent-telegram-config", async (params) => {
      const { agentId, chatId, enabled } = params as { agentId: string; chatId: string; enabled: boolean };
      if (!agentId) throw new Error("agentId required");

      await ctx.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: STATE_ENABLED }, enabled ? "1" : "");
      if (chatId) {
        await ctx.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: STATE_CHAT_ID }, chatId);
        // Also store reverse mapping: chatId → agentId
        await ctx.state.set({ scopeKind: "instance", scopeId: "global", stateKey: `${STATE_CHAT_MAPPING}-${chatId}` }, agentId);
      }

      return { ok: true };
    });

    // ─── Action: send test message (used by UI) ───
    ctx.actions.register("send-test-message", async (params) => {
      const { chatId } = params as { chatId: string };
      if (!chatId) throw new Error("chatId required");

      const botToken = await ctx.secrets.read("telegram-bot-token");
      if (!botToken) throw new Error("Bot token not configured. Go to plugin settings.");

      const result = await sendTelegramMessage(
        botToken,
        chatId,
        "✅ <b>Paperclip connected!</b>\n\nTelegram notifications are working."
      );

      if (!result.ok) throw new Error(result.description || "Failed to send message");
      return { ok: true };
    });

    // ─── Action: configure webhook (called after install) ───
    ctx.actions.register("configure-webhook", async (params) => {
      const { paperclipUrl, pluginId } = params as { paperclipUrl: string; pluginId: string };
      const botToken = await ctx.secrets.read("telegram-bot-token");
      if (!botToken) throw new Error("Bot token not configured");

      const webhookUrl = `${paperclipUrl}/api/plugins/${pluginId}/webhooks/telegram`;
      const result = await setWebhook(botToken, webhookUrl);

      if (!result.ok) throw new Error(result.description || "Failed to set webhook");
      return { ok: true, webhookUrl };
    });

    // ─── Action: get bot info ───
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
    return { status: "ok" as const };
  },

  // ─── Config validation ───
  async onValidateConfig(config) {
    const c = config as Record<string, unknown>;
    if (!c.botToken) {
      return { ok: false, errors: ["botToken is required"] };
    }
    // Test the token
    try {
      const result = await getBotInfo(c.botToken as string);
      if (!result.ok) {
        return { ok: false, errors: ["Invalid bot token — could not connect to Telegram"] };
      }
      return { ok: true, warnings: [`Connected as @${result.result?.username}`] };
    } catch (err) {
      return { ok: false, errors: [`Connection failed: ${err instanceof Error ? err.message : String(err)}`] };
    }
  },

  // ─── Config changed ───
  async onConfigChanged(newConfig) {
    const c = newConfig as Record<string, unknown>;
    if (c.botToken) {
      // Store as secret
      // Note: secrets are set via the plugin settings UI or API, not here
    }
  },

  // ─── Webhook handler: incoming Telegram updates ───
  async onWebhook(input) {
    if (input.endpointKey !== "telegram") return { status: 200, body: { ok: true } };

    const update = input.body as TelegramUpdate;

    if (!update.message?.text || !update.message?.chat?.id) {
      return { status: 200, body: { ok: true } };
    }

    const chatId = String(update.message.chat.id);
    const text = update.message.text;
    const fromName = update.message.from?.first_name || "User";

    // Look up which agent is mapped to this chat
    const agentId = await (async () => {
      try {
        const val = await (plugin as any).__ctx?.state?.get({
          scopeKind: "instance",
          scopeId: "global",
          stateKey: `${STATE_CHAT_MAPPING}-${chatId}`,
        });
        return val as string | null;
      } catch {
        return null;
      }
    })();

    if (!agentId) {
      // No agent mapped to this chat — ignore silently
      return { status: 200, body: { ok: true } };
    }

    // Wake the agent with the message as context
    try {
      // We need companyId — get it from the agent mapping state
      // For now, log and rely on the agent's next heartbeat to pick it up
      // Store the message in state for the agent to read
      await (plugin as any).__ctx?.state?.set(
        { scopeKind: "agent", scopeId: agentId, stateKey: "telegram-pending-message" },
        JSON.stringify({ chatId, text, fromName, timestamp: Date.now() })
      );
    } catch (err) {
      // ignore state errors
    }

    return { status: 200, body: { ok: true } };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
