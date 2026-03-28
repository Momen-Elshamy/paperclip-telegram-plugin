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

    // ─── Agent Tool: send-telegram ───
    // Agents can call this tool directly during heartbeats
    ctx.tools.register("send-telegram", {
      displayName: "Send Telegram Message",
      description: "Send a message to Momen on Telegram. Use this when you need human input, are blocked, completed a major task, or want to share an important update.",
      parametersSchema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The message to send. Be concise and clear. Include context about what you need or what happened.",
          },
          urgent: {
            type: "boolean",
            description: "Set to true if this requires immediate attention (blocked, waiting for approval, critical error).",
          },
        },
        required: ["message"],
      },
    }, async (params, toolCtx) => {
      const { message, urgent } = params as { message: string; urgent?: boolean };

      // Get bot token
      const botToken = await ctx.secrets.read("telegram-bot-token");
      if (!botToken) {
        return {
          content: "Telegram not configured: bot token missing.",
          data: { ok: false, error: "no_bot_token" },
        };
      }

      // Get agent's configured chat ID
      const agentId = toolCtx.agentId;
      const chatId = await ctx.state.get({
        scopeKind: "agent",
        scopeId: agentId,
        stateKey: STATE_CHAT_ID,
      });

      if (!chatId) {
        return {
          content: "Telegram not configured for this agent: no Chat ID set. Ask Momen to configure it at /ORGA/telegram.",
          data: { ok: false, error: "no_chat_id" },
        };
      }

      // Get agent name for context
      let agentName = "Agent";
      try {
        const agents = await ctx.agents.list({ companyId: toolCtx.companyId });
        const agent = agents.find((a: { id: string; name: string }) => a.id === agentId);
        if (agent) agentName = agent.name;
      } catch { /* ignore */ }

      const urgentPrefix = urgent ? "🚨 " : "";
      const formattedMessage = `${urgentPrefix}🤖 <b>${agentName}</b>\n\n${message}`;

      const result = await sendTelegramMessage(botToken, chatId as string, formattedMessage);

      if (!result.ok) {
        return {
          content: `Failed to send Telegram message: ${result.description}`,
          data: { ok: false, error: result.description },
        };
      }

      return {
        content: `Telegram message sent to Momen successfully.`,
        data: { ok: true, messageId: result.result?.message_id },
      };
    });

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

    // ─── Data endpoint: list all agents ───
    ctx.data.register("agents-list", async ({ companyId }) => {
      if (!companyId) return [];
      try {
        const agents = await ctx.agents.list({ companyId: String(companyId) });
        return agents.map((a: { id: string; name: string; role: string; status: string }) => ({
          id: a.id, name: a.name, role: a.role, status: a.status,
        }));
      } catch {
        return [];
      }
    });

    // ─── Data endpoint: get ALL agent configs for a company ───
    ctx.data.register("all-agent-configs", async ({ companyId }) => {
      if (!companyId) return {};
      try {
        const agents = await ctx.agents.list({ companyId: String(companyId) });
        const result: Record<string, object> = {};
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
            notifyOnBlocked: notifyOnBlocked === "1",
          };
        }
        return result;
      } catch {
        return {};
      }
    });

    // ─── Data endpoint: get single agent Telegram config ───
    ctx.data.register("agent-telegram-config", async ({ agentId }) => {
      if (!agentId) return { enabled: false, chatId: null };
      const enabled = await ctx.state.get({ scopeKind: "agent", scopeId: String(agentId), stateKey: STATE_ENABLED });
      const chatId = await ctx.state.get({ scopeKind: "agent", scopeId: String(agentId), stateKey: STATE_CHAT_ID });
      return { enabled: !!enabled, chatId: chatId || null };
    });

    // ─── Action: save agent Telegram config ───
    ctx.actions.register("save-agent-telegram-config", async (params) => {
      const { agentId, chatId, enabled, notifyOnComplete, notifyOnFail, notifyOnBlocked } = params as {
        agentId: string; chatId: string; enabled: boolean;
        notifyOnComplete: boolean; notifyOnFail: boolean; notifyOnBlocked: boolean;
      };
      if (!agentId) throw new Error("agentId required");

      await ctx.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: STATE_ENABLED }, enabled ? "1" : "");
      await ctx.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: "telegram-notify-complete" }, notifyOnComplete ? "1" : "0");
      await ctx.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: "telegram-notify-fail" }, notifyOnFail ? "1" : "0");
      await ctx.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: "telegram-notify-blocked" }, notifyOnBlocked ? "1" : "0");
      if (chatId) {
        await ctx.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: STATE_CHAT_ID }, chatId);
        await ctx.state.set({ scopeKind: "instance", scopeId: "global", stateKey: `${STATE_CHAT_MAPPING}-${chatId}` }, agentId);
      }
      // Store companyId for webhook-triggered invocation
      const companyIdParam = (params as Record<string, unknown>).companyId as string | undefined;
      if (companyIdParam) {
        await ctx.state.set({ scopeKind: "agent", scopeId: agentId, stateKey: "telegram-company-id" }, companyIdParam);
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
    const fromName = update.message.from?.first_name || "Momen";

    ctx.logger.info("Telegram message received", { chatId, text: text.slice(0, 100) });

    // Look up which agent is mapped to this chat
    const agentId = await ctx.state.get({
      scopeKind: "instance",
      scopeId: "global",
      stateKey: `${STATE_CHAT_MAPPING}-${chatId}`,
    }) as string | null;

    if (!agentId) {
      ctx.logger.warn("No agent mapped to chat", { chatId });
      return { status: 200, body: { ok: true } };
    }

    // Store the message in agent state
    await ctx.state.set(
      { scopeKind: "agent", scopeId: agentId, stateKey: "telegram-pending-message" },
      JSON.stringify({ chatId, text, fromName, timestamp: Date.now() })
    );

    // Wake the agent immediately
    try {
      const companyId = await ctx.state.get({
        scopeKind: "agent",
        scopeId: agentId,
        stateKey: "telegram-company-id",
      }) as string | null;

      if (companyId) {
        await ctx.agents.invoke(agentId, companyId, {
          wakeReason: "telegram_message",
          wakeContext: {
            telegramMessage: text,
            telegramFrom: fromName,
            telegramChatId: chatId,
          },
        });
        ctx.logger.info("Agent woken via Telegram message", { agentId });
      }
    } catch (err) {
      ctx.logger.warn("Could not invoke agent directly, message stored in state", { agentId, err });
    }

    return { status: 200, body: { ok: true } };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
