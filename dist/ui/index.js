// src/ui/TelegramSettingsPage.tsx
import { useState, useEffect } from "react";
import { usePluginData, usePluginAction } from "@paperclipai/plugin-sdk/ui/hooks";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function TelegramSettingsPage({ context }) {
  const companyId = context.companyId;
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
    return /* @__PURE__ */ jsx("div", { style: s.container, children: /* @__PURE__ */ jsx("p", { style: s.muted, children: "Loading..." }) });
  }
  return /* @__PURE__ */ jsxs("div", { style: s.container, children: [
    /* @__PURE__ */ jsxs("div", { style: s.header, children: [
      /* @__PURE__ */ jsx("h1", { style: s.title, children: "\u{1F4EC} Telegram Notifications" }),
      /* @__PURE__ */ jsxs("p", { style: s.subtitle, children: [
        "Configure which agents send Telegram messages and when.",
        botInfo && /* @__PURE__ */ jsxs("span", { style: s.botBadge, children: [
          "Connected: @",
          botInfo.username
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: s.layout, children: [
      /* @__PURE__ */ jsxs("div", { style: s.agentList, children: [
        /* @__PURE__ */ jsx("div", { style: s.listHeader, children: "Agents" }),
        !agents || agents.length === 0 ? /* @__PURE__ */ jsx("p", { style: s.muted, children: "No agents found" }) : agents.map((agent) => {
          const cfg = allConfigs?.[agent.id];
          const active = cfg?.enabled && !!cfg?.chatId;
          return /* @__PURE__ */ jsxs(
            "div",
            {
              onClick: () => setSelectedAgentId(agent.id),
              style: { ...s.agentRow, ...selectedAgentId === agent.id ? s.agentRowActive : {} },
              children: [
                /* @__PURE__ */ jsx("div", { style: s.agentName, children: agent.name }),
                /* @__PURE__ */ jsxs("div", { style: s.agentRole, children: [
                  agent.role,
                  active && /* @__PURE__ */ jsx("span", { style: s.activeDot, children: "\u25CF" })
                ] })
              ]
            },
            agent.id
          );
        })
      ] }),
      /* @__PURE__ */ jsx("div", { style: s.panel, children: !selectedAgentId ? /* @__PURE__ */ jsx("div", { style: s.empty, children: "\u2190 Select an agent to configure Telegram" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("h2", { style: s.agentTitle, children: selectedAgent?.name }),
        /* @__PURE__ */ jsx("div", { style: s.field, children: /* @__PURE__ */ jsxs("label", { style: s.checkLabel, children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              checked: editState.enabled,
              onChange: (e) => setEditState({ ...editState, enabled: e.target.checked }),
              style: { marginRight: 8 }
            }
          ),
          "Enable Telegram notifications"
        ] }) }),
        /* @__PURE__ */ jsxs("div", { style: s.field, children: [
          /* @__PURE__ */ jsx("label", { style: s.label, children: "Telegram Chat ID" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: editState.chatId || "",
              onChange: (e) => setEditState({ ...editState, chatId: e.target.value }),
              placeholder: "e.g. 991432117",
              style: s.input,
              disabled: !editState.enabled
            }
          ),
          /* @__PURE__ */ jsxs("p", { style: s.hint, children: [
            "Message ",
            /* @__PURE__ */ jsx("a", { href: "https://t.me/userinfobot", target: "_blank", rel: "noreferrer", style: s.link, children: "@userinfobot" }),
            " on Telegram to find your Chat ID."
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: s.field, children: [
          /* @__PURE__ */ jsx("label", { style: s.label, children: "Notify me when:" }),
          /* @__PURE__ */ jsx("div", { style: s.checkGroup, children: [
            { key: "notifyOnComplete", label: "Run completes \u2705" },
            { key: "notifyOnFail", label: "Run fails \u274C" },
            { key: "notifyOnBlocked", label: "Agent gets blocked \u26A0\uFE0F" }
          ].map(({ key, label }) => /* @__PURE__ */ jsxs("label", { style: s.checkLabel, children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked: editState[key],
                onChange: (e) => setEditState({ ...editState, [key]: e.target.checked }),
                disabled: !editState.enabled,
                style: { marginRight: 8 }
              }
            ),
            label
          ] }, key)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: s.actions, children: [
          /* @__PURE__ */ jsx("button", { onClick: handleSave, disabled: saving, style: s.primaryBtn, children: saving ? "Saving..." : "Save" }),
          /* @__PURE__ */ jsx("button", { onClick: handleTest, disabled: testing || !editState.chatId || !editState.enabled, style: s.secondaryBtn, children: testing ? "Sending..." : "Send Test" })
        ] }),
        message && /* @__PURE__ */ jsx("div", { style: message.type === "success" ? s.success : s.error, children: message.text })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: s.guide, children: [
      /* @__PURE__ */ jsx("strong", { children: "Setup:" }),
      " Go to",
      " ",
      /* @__PURE__ */ jsx("strong", { children: "Settings \u2192 Plugins \u2192 Telegram Notifications" }),
      " to set your Bot Token, then configure each agent above."
    ] })
  ] });
}
var s = {
  container: { padding: "24px 32px", fontFamily: "inherit", maxWidth: 860 },
  header: { marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 700, margin: "0 0 4px 0" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: 0 },
  botBadge: { marginLeft: 10, fontSize: 12, background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 999, fontWeight: 500 },
  layout: { display: "flex", gap: 20, marginBottom: 20 },
  agentList: { width: 190, flexShrink: 0, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" },
  listHeader: { fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", padding: "8px 12px", borderBottom: "1px solid #f3f4f6" },
  agentRow: { padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #f9fafb" },
  agentRowActive: { background: "#eff6ff" },
  agentName: { fontSize: 13, fontWeight: 500, color: "#111827" },
  agentRole: { fontSize: 11, color: "#9ca3af", marginTop: 2, display: "flex", alignItems: "center", gap: 4 },
  activeDot: { color: "#22c55e", fontSize: 10 },
  panel: { flex: 1, border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 },
  empty: { color: "#9ca3af", fontSize: 13, padding: "40px 0", textAlign: "center" },
  agentTitle: { fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "#374151" },
  checkLabel: { display: "flex", alignItems: "center", fontSize: 13, color: "#374151", cursor: "pointer" },
  checkGroup: { display: "flex", flexDirection: "column", gap: 8 },
  input: { width: "100%", padding: "8px 12px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6, boxSizing: "border-box" },
  hint: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  actions: { display: "flex", gap: 8, marginBottom: 12, marginTop: 16 },
  primaryBtn: { padding: "8px 16px", fontSize: 13, fontWeight: 500, background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" },
  secondaryBtn: { padding: "8px 16px", fontSize: 13, fontWeight: 500, background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer" },
  success: { padding: "10px 14px", background: "#d1fae5", color: "#065f46", borderRadius: 6, fontSize: 13 },
  error: { padding: "10px 14px", background: "#fee2e2", color: "#991b1b", borderRadius: 6, fontSize: 13 },
  guide: { padding: 14, background: "#f0f9ff", borderRadius: 8, fontSize: 13, color: "#0c4a6e" },
  link: { color: "#2563eb" },
  muted: { color: "#9ca3af", fontSize: 13, padding: 12 }
};

// src/ui/TelegramSidebarLink.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function TelegramSidebarLink({ context }) {
  const href = context.companyPrefix ? `/${context.companyPrefix}/telegram` : "/telegram";
  const isActive = typeof window !== "undefined" && window.location.pathname === href;
  return /* @__PURE__ */ jsxs2(
    "a",
    {
      href,
      "aria-current": isActive ? "page" : void 0,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        fontSize: 13,
        fontWeight: 500,
        textDecoration: "none",
        color: isActive ? "inherit" : "rgba(var(--foreground), 0.8)",
        borderRadius: 6,
        background: isActive ? "var(--accent)" : "transparent",
        transition: "background 0.15s"
      },
      children: [
        /* @__PURE__ */ jsx2("span", { children: "\u{1F4EC}" }),
        /* @__PURE__ */ jsx2("span", { children: "Telegram" })
      ]
    }
  );
}
export {
  TelegramSettingsPage,
  TelegramSidebarLink
};
//# sourceMappingURL=index.js.map
