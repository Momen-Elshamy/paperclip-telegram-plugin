// src/ui/AgentTelegramTab.tsx
import { useState, useEffect } from "react";
import { usePluginData, usePluginAction, useHostContext } from "@paperclipai/plugin-sdk/ui/hooks";
import { jsx, jsxs } from "react/jsx-runtime";
function AgentTelegramTab() {
  const { agent } = useHostContext();
  const agentId = agent?.id;
  const { data: config, loading, refresh } = usePluginData(
    "agent-telegram-config",
    { agentId },
    { skip: !agentId }
  );
  const [chatId, setChatId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);
  useEffect(() => {
    if (config) {
      setChatId(config.chatId || "");
      setEnabled(config.enabled);
    }
  }, [config]);
  const saveConfig = usePluginAction("save-agent-telegram-config");
  const sendTest = usePluginAction("send-test-message");
  const handleSave = async () => {
    if (!agentId) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveConfig({ agentId, chatId, enabled });
      setMessage({ type: "success", text: "Saved successfully!" });
      refresh();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };
  const handleTest = async () => {
    if (!chatId) {
      setMessage({ type: "error", text: "Enter a Chat ID first" });
      return;
    }
    setTesting(true);
    setMessage(null);
    try {
      await sendTest({ chatId });
      setMessage({ type: "success", text: "Test message sent! Check your Telegram." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Test failed" });
    } finally {
      setTesting(false);
    }
  };
  if (loading) {
    return /* @__PURE__ */ jsx("div", { style: styles.container, children: /* @__PURE__ */ jsx("p", { style: styles.muted, children: "Loading..." }) });
  }
  return /* @__PURE__ */ jsxs("div", { style: styles.container, children: [
    /* @__PURE__ */ jsx("h3", { style: styles.heading, children: "Telegram Integration" }),
    /* @__PURE__ */ jsx("p", { style: styles.description, children: "Connect this agent to Telegram. The agent will send notifications when runs finish, and can receive messages you send via Telegram." }),
    /* @__PURE__ */ jsx("div", { style: styles.field, children: /* @__PURE__ */ jsxs("label", { style: styles.label, children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "checkbox",
          checked: enabled,
          onChange: (e) => setEnabled(e.target.checked),
          style: { marginRight: 8 }
        }
      ),
      "Enable Telegram notifications"
    ] }) }),
    /* @__PURE__ */ jsxs("div", { style: styles.field, children: [
      /* @__PURE__ */ jsx("label", { style: styles.label, children: "Telegram Chat ID" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: chatId,
          onChange: (e) => setChatId(e.target.value),
          placeholder: "e.g. 991432117",
          style: styles.input,
          disabled: !enabled
        }
      ),
      /* @__PURE__ */ jsxs("p", { style: styles.hint, children: [
        "Your personal Chat ID or a group Chat ID. Send a message to",
        " ",
        /* @__PURE__ */ jsx("a", { href: "https://t.me/userinfobot", target: "_blank", rel: "noreferrer", style: styles.link, children: "@userinfobot" }),
        " ",
        "on Telegram to find your ID."
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: styles.actions, children: [
      /* @__PURE__ */ jsx("button", { onClick: handleSave, disabled: saving, style: styles.primaryBtn, children: saving ? "Saving..." : "Save" }),
      /* @__PURE__ */ jsx("button", { onClick: handleTest, disabled: testing || !chatId, style: styles.secondaryBtn, children: testing ? "Sending..." : "Send Test Message" })
    ] }),
    message && /* @__PURE__ */ jsx("div", { style: message.type === "success" ? styles.successBox : styles.errorBox, children: message.text }),
    /* @__PURE__ */ jsxs("div", { style: styles.infoBox, children: [
      /* @__PURE__ */ jsx("strong", { children: "Setup Instructions" }),
      /* @__PURE__ */ jsxs("ol", { style: { paddingLeft: 20, marginTop: 8 }, children: [
        /* @__PURE__ */ jsxs("li", { children: [
          "Create a bot with ",
          /* @__PURE__ */ jsx("a", { href: "https://t.me/BotFather", target: "_blank", rel: "noreferrer", style: styles.link, children: "@BotFather" }),
          " on Telegram and copy the token."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          "Go to ",
          /* @__PURE__ */ jsx("strong", { children: "Plugin Settings" }),
          " (instance-level) and paste the Bot Token."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          "Enter your Chat ID above and click ",
          /* @__PURE__ */ jsx("strong", { children: "Save" }),
          "."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          "Click ",
          /* @__PURE__ */ jsx("strong", { children: "Send Test Message" }),
          " to verify the connection."
        ] })
      ] })
    ] })
  ] });
}
var styles = {
  container: { padding: "24px", maxWidth: 480, fontFamily: "inherit" },
  heading: { fontSize: 16, fontWeight: 600, marginBottom: 4, marginTop: 0 },
  description: { fontSize: 13, color: "#6b7280", marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "#374151" },
  input: {
    width: "100%",
    padding: "8px 12px",
    fontSize: 13,
    border: "1px solid #d1d5db",
    borderRadius: 6,
    boxSizing: "border-box"
  },
  hint: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  actions: { display: "flex", gap: 8, marginBottom: 16 },
  primaryBtn: {
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer"
  },
  secondaryBtn: {
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    background: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    cursor: "pointer"
  },
  successBox: {
    padding: "10px 14px",
    background: "#d1fae5",
    color: "#065f46",
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 16
  },
  errorBox: {
    padding: "10px 14px",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 16
  },
  infoBox: {
    padding: "14px",
    background: "#f0f9ff",
    borderRadius: 6,
    fontSize: 13,
    color: "#0c4a6e",
    marginTop: 8
  },
  link: { color: "#2563eb" },
  muted: { color: "#9ca3af", fontSize: 13 }
};
var AgentTelegramTab_default = AgentTelegramTab;
export {
  AgentTelegramTab,
  AgentTelegramTab_default as default
};
//# sourceMappingURL=AgentTelegramTab.js.map
