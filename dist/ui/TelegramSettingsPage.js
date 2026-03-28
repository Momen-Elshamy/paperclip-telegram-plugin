// src/ui/TelegramSettingsPage.tsx
import { useState, useEffect } from "react";
import { usePluginData, usePluginAction, useHostContext } from "@paperclipai/plugin-sdk/ui/hooks";
import { jsx, jsxs } from "react/jsx-runtime";
function TelegramSettingsPage() {
  const { company } = useHostContext();
  const companyId = company?.id;
  const { data: agents, loading: agentsLoading } = usePluginData(
    "agents-list",
    { companyId },
    { skip: !companyId }
  );
  const { data: allConfigs, loading: configsLoading, refresh } = usePluginData("all-agent-configs", { companyId }, { skip: !companyId });
  const saveConfig = usePluginAction("save-agent-telegram-config");
  const sendTest = usePluginAction("send-test-message");
  const getBotInfo = usePluginAction("get-bot-info");
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [editState, setEditState] = useState({
    chatId: "",
    enabled: false,
    notifyOnComplete: true,
    notifyOnFail: true,
    notifyOnBlocked: false
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);
  const [botInfo, setBotInfo] = useState(null);
  useEffect(() => {
    getBotInfo({}).then((info) => setBotInfo(info)).catch(() => setBotInfo(null));
  }, []);
  useEffect(() => {
    if (!selectedAgentId || !allConfigs) return;
    const config = allConfigs[selectedAgentId];
    if (config) {
      setEditState({
        chatId: config.chatId || "",
        enabled: config.enabled,
        notifyOnComplete: config.notifyOnComplete ?? true,
        notifyOnFail: config.notifyOnFail ?? true,
        notifyOnBlocked: config.notifyOnBlocked ?? false
      });
    } else {
      setEditState({ chatId: "", enabled: false, notifyOnComplete: true, notifyOnFail: true, notifyOnBlocked: false });
    }
    setMessage(null);
  }, [selectedAgentId, allConfigs]);
  const handleSave = async () => {
    if (!selectedAgentId) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveConfig({ agentId: selectedAgentId, ...editState });
      setMessage({ type: "success", text: "Saved!" });
      refresh();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };
  const handleTest = async () => {
    if (!editState.chatId) return;
    setTesting(true);
    setMessage(null);
    try {
      await sendTest({ chatId: editState.chatId });
      setMessage({ type: "success", text: "Test message sent! Check Telegram." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Test failed" });
    } finally {
      setTesting(false);
    }
  };
  const selectedAgent = agents?.find((a) => a.id === selectedAgentId);
  if (agentsLoading || configsLoading) {
    return /* @__PURE__ */ jsx("div", { style: styles.container, children: /* @__PURE__ */ jsx("p", { style: styles.muted, children: "Loading..." }) });
  }
  return /* @__PURE__ */ jsxs("div", { style: styles.container, children: [
    /* @__PURE__ */ jsx("div", { style: styles.header, children: /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { style: styles.title, children: "\u{1F4EC} Telegram Notifications" }),
      /* @__PURE__ */ jsxs("p", { style: styles.subtitle, children: [
        "Configure which agents send Telegram messages and when.",
        botInfo && /* @__PURE__ */ jsxs("span", { style: styles.botBadge, children: [
          "Bot: @",
          botInfo.username
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { style: styles.layout, children: [
      /* @__PURE__ */ jsxs("div", { style: styles.sidebar, children: [
        /* @__PURE__ */ jsx("h3", { style: styles.sidebarTitle, children: "Agents" }),
        !agents || agents.length === 0 ? /* @__PURE__ */ jsx("p", { style: styles.muted, children: "No agents found" }) : agents.map((agent) => {
          const config = allConfigs?.[agent.id];
          const isEnabled = config?.enabled && config?.chatId;
          return /* @__PURE__ */ jsxs(
            "div",
            {
              onClick: () => setSelectedAgentId(agent.id),
              style: {
                ...styles.agentRow,
                ...selectedAgentId === agent.id ? styles.agentRowActive : {}
              },
              children: [
                /* @__PURE__ */ jsx("div", { style: styles.agentName, children: agent.name }),
                /* @__PURE__ */ jsxs("div", { style: styles.agentMeta, children: [
                  agent.role,
                  isEnabled && /* @__PURE__ */ jsx("span", { style: styles.enabledDot, children: "\u25CF" })
                ] })
              ]
            },
            agent.id
          );
        })
      ] }),
      /* @__PURE__ */ jsx("div", { style: styles.main, children: !selectedAgentId ? /* @__PURE__ */ jsx("div", { style: styles.emptyState, children: /* @__PURE__ */ jsx("p", { children: "\u2190 Select an agent to configure Telegram notifications" }) }) : /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { style: styles.agentTitle, children: selectedAgent?.name }),
        /* @__PURE__ */ jsx("div", { style: styles.field, children: /* @__PURE__ */ jsxs("label", { style: styles.checkLabel, children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              checked: editState.enabled,
              onChange: (e) => setEditState({ ...editState, enabled: e.target.checked }),
              style: { marginRight: 8 }
            }
          ),
          "Enable Telegram notifications for this agent"
        ] }) }),
        /* @__PURE__ */ jsxs("div", { style: styles.field, children: [
          /* @__PURE__ */ jsx("label", { style: styles.label, children: "Telegram Chat ID" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: editState.chatId || "",
              onChange: (e) => setEditState({ ...editState, chatId: e.target.value }),
              placeholder: "e.g. 991432117",
              style: styles.input,
              disabled: !editState.enabled
            }
          ),
          /* @__PURE__ */ jsxs("p", { style: styles.hint, children: [
            "Send a message to",
            " ",
            /* @__PURE__ */ jsx("a", { href: "https://t.me/userinfobot", target: "_blank", rel: "noreferrer", style: styles.link, children: "@userinfobot" }),
            " ",
            "on Telegram to find your Chat ID."
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: styles.field, children: [
          /* @__PURE__ */ jsx("label", { style: styles.label, children: "Notify me when:" }),
          /* @__PURE__ */ jsxs("div", { style: styles.checkboxGroup, children: [
            /* @__PURE__ */ jsxs("label", { style: styles.checkLabel, children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: editState.notifyOnComplete,
                  onChange: (e) => setEditState({ ...editState, notifyOnComplete: e.target.checked }),
                  disabled: !editState.enabled,
                  style: { marginRight: 8 }
                }
              ),
              "Run completes \u2705"
            ] }),
            /* @__PURE__ */ jsxs("label", { style: styles.checkLabel, children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: editState.notifyOnFail,
                  onChange: (e) => setEditState({ ...editState, notifyOnFail: e.target.checked }),
                  disabled: !editState.enabled,
                  style: { marginRight: 8 }
                }
              ),
              "Run fails \u274C"
            ] }),
            /* @__PURE__ */ jsxs("label", { style: styles.checkLabel, children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: editState.notifyOnBlocked,
                  onChange: (e) => setEditState({ ...editState, notifyOnBlocked: e.target.checked }),
                  disabled: !editState.enabled,
                  style: { marginRight: 8 }
                }
              ),
              "Agent gets blocked \u26A0\uFE0F"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: styles.actions, children: [
          /* @__PURE__ */ jsx("button", { onClick: handleSave, disabled: saving, style: styles.primaryBtn, children: saving ? "Saving..." : "Save" }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleTest,
              disabled: testing || !editState.chatId || !editState.enabled,
              style: styles.secondaryBtn,
              children: testing ? "Sending..." : "Send Test"
            }
          )
        ] }),
        message && /* @__PURE__ */ jsx("div", { style: message.type === "success" ? styles.successBox : styles.errorBox, children: message.text })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: styles.guide, children: [
      /* @__PURE__ */ jsx("strong", { children: "Quick Setup" }),
      /* @__PURE__ */ jsxs("ol", { style: { paddingLeft: 20, marginTop: 8, fontSize: 13 }, children: [
        /* @__PURE__ */ jsxs("li", { children: [
          "Create a bot with ",
          /* @__PURE__ */ jsx("a", { href: "https://t.me/BotFather", target: "_blank", rel: "noreferrer", style: styles.link, children: "@BotFather" }),
          " and copy the token."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          "Go to ",
          /* @__PURE__ */ jsx("strong", { children: "Settings \u2192 Plugins \u2192 Telegram Notifications" }),
          " and paste the Bot Token."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          "Select an agent above, enter your Chat ID, and click ",
          /* @__PURE__ */ jsx("strong", { children: "Save" }),
          "."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          "Click ",
          /* @__PURE__ */ jsx("strong", { children: "Send Test" }),
          " to verify."
        ] })
      ] })
    ] })
  ] });
}
var styles = {
  container: { padding: "24px 32px", fontFamily: "inherit", maxWidth: 900 },
  header: { marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 700, margin: "0 0 4px 0" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: 0 },
  botBadge: {
    marginLeft: 10,
    fontSize: 12,
    background: "#dcfce7",
    color: "#166534",
    padding: "2px 8px",
    borderRadius: 999,
    fontWeight: 500
  },
  layout: { display: "flex", gap: 24, marginBottom: 24 },
  sidebar: {
    width: 200,
    flexShrink: 0,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    overflow: "hidden"
  },
  sidebarTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#9ca3af",
    textTransform: "uppercase",
    padding: "10px 12px",
    borderBottom: "1px solid #f3f4f6",
    margin: 0
  },
  agentRow: {
    padding: "10px 12px",
    cursor: "pointer",
    borderBottom: "1px solid #f3f4f6",
    transition: "background 0.1s"
  },
  agentRowActive: { background: "#eff6ff" },
  agentName: { fontSize: 13, fontWeight: 500, color: "#111827" },
  agentMeta: { fontSize: 11, color: "#9ca3af", marginTop: 2, display: "flex", alignItems: "center", gap: 4 },
  enabledDot: { color: "#22c55e", fontSize: 10 },
  main: { flex: 1, border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 },
  emptyState: { color: "#9ca3af", fontSize: 13, padding: "40px 20px", textAlign: "center" },
  agentTitle: { fontSize: 16, fontWeight: 600, marginTop: 0, marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "#374151" },
  checkLabel: { display: "flex", alignItems: "center", fontSize: 13, color: "#374151", cursor: "pointer" },
  checkboxGroup: { display: "flex", flexDirection: "column", gap: 8 },
  input: {
    width: "100%",
    padding: "8px 12px",
    fontSize: 13,
    border: "1px solid #d1d5db",
    borderRadius: 6,
    boxSizing: "border-box"
  },
  hint: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  actions: { display: "flex", gap: 8, marginBottom: 12 },
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
    fontSize: 13
  },
  errorBox: {
    padding: "10px 14px",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: 6,
    fontSize: 13
  },
  guide: {
    padding: 16,
    background: "#f0f9ff",
    borderRadius: 8,
    fontSize: 13,
    color: "#0c4a6e"
  },
  link: { color: "#2563eb" },
  muted: { color: "#9ca3af", fontSize: 13, padding: 12 }
};
export {
  TelegramSettingsPage
};
//# sourceMappingURL=TelegramSettingsPage.js.map
