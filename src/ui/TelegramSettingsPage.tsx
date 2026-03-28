/**
 * TelegramSettingsPage — a full page inside Paperclip for configuring
 * Telegram notifications per agent.
 *
 * Route: /<company>/telegram
 */
import React, { useState, useEffect } from "react";
import { usePluginData, usePluginAction, useHostContext } from "@paperclipai/plugin-sdk/ui/hooks";

interface Agent {
  id: string;
  name: string;
  role: string;
  status: string;
}

interface AgentTelegramConfig {
  chatId: string | null;
  enabled: boolean;
  notifyOnComplete: boolean;
  notifyOnFail: boolean;
  notifyOnBlocked: boolean;
}

export function TelegramSettingsPage() {
  const { company } = useHostContext();
  const companyId = company?.id;

  const { data: agents, loading: agentsLoading } = usePluginData<Agent[]>(
    "agents-list",
    { companyId },
    { skip: !companyId }
  );

  const { data: allConfigs, loading: configsLoading, refresh } = usePluginData<
    Record<string, AgentTelegramConfig>
  >("all-agent-configs", { companyId }, { skip: !companyId });

  const saveConfig = usePluginAction("save-agent-telegram-config");
  const sendTest = usePluginAction("send-test-message");
  const getBotInfo = usePluginAction("get-bot-info");

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [editState, setEditState] = useState<AgentTelegramConfig>({
    chatId: "",
    enabled: false,
    notifyOnComplete: true,
    notifyOnFail: true,
    notifyOnBlocked: false,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [botInfo, setBotInfo] = useState<{ username: string } | null>(null);

  // Load bot info on mount
  useEffect(() => {
    getBotInfo({})
      .then((info: { username: string }) => setBotInfo(info))
      .catch(() => setBotInfo(null));
  }, []);

  // When an agent is selected, load its config
  useEffect(() => {
    if (!selectedAgentId || !allConfigs) return;
    const config = allConfigs[selectedAgentId];
    if (config) {
      setEditState({
        chatId: config.chatId || "",
        enabled: config.enabled,
        notifyOnComplete: config.notifyOnComplete ?? true,
        notifyOnFail: config.notifyOnFail ?? true,
        notifyOnBlocked: config.notifyOnBlocked ?? false,
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
    return <div style={styles.container}><p style={styles.muted}>Loading...</p></div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📬 Telegram Notifications</h1>
          <p style={styles.subtitle}>
            Configure which agents send Telegram messages and when.
            {botInfo && (
              <span style={styles.botBadge}>Bot: @{botInfo.username}</span>
            )}
          </p>
        </div>
      </div>

      <div style={styles.layout}>
        {/* Agent List */}
        <div style={styles.sidebar}>
          <h3 style={styles.sidebarTitle}>Agents</h3>
          {!agents || agents.length === 0 ? (
            <p style={styles.muted}>No agents found</p>
          ) : (
            agents.map((agent) => {
              const config = allConfigs?.[agent.id];
              const isEnabled = config?.enabled && config?.chatId;
              return (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  style={{
                    ...styles.agentRow,
                    ...(selectedAgentId === agent.id ? styles.agentRowActive : {}),
                  }}
                >
                  <div style={styles.agentName}>{agent.name}</div>
                  <div style={styles.agentMeta}>
                    {agent.role}
                    {isEnabled && <span style={styles.enabledDot}>●</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Config Panel */}
        <div style={styles.main}>
          {!selectedAgentId ? (
            <div style={styles.emptyState}>
              <p>← Select an agent to configure Telegram notifications</p>
            </div>
          ) : (
            <div>
              <h2 style={styles.agentTitle}>{selectedAgent?.name}</h2>

              {/* Enable toggle */}
              <div style={styles.field}>
                <label style={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={editState.enabled}
                    onChange={(e) => setEditState({ ...editState, enabled: e.target.checked })}
                    style={{ marginRight: 8 }}
                  />
                  Enable Telegram notifications for this agent
                </label>
              </div>

              {/* Chat ID */}
              <div style={styles.field}>
                <label style={styles.label}>Telegram Chat ID</label>
                <input
                  type="text"
                  value={editState.chatId || ""}
                  onChange={(e) => setEditState({ ...editState, chatId: e.target.value })}
                  placeholder="e.g. 991432117"
                  style={styles.input}
                  disabled={!editState.enabled}
                />
                <p style={styles.hint}>
                  Send a message to{" "}
                  <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" style={styles.link}>
                    @userinfobot
                  </a>{" "}
                  on Telegram to find your Chat ID.
                </p>
              </div>

              {/* Notification triggers */}
              <div style={styles.field}>
                <label style={styles.label}>Notify me when:</label>
                <div style={styles.checkboxGroup}>
                  <label style={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={editState.notifyOnComplete}
                      onChange={(e) => setEditState({ ...editState, notifyOnComplete: e.target.checked })}
                      disabled={!editState.enabled}
                      style={{ marginRight: 8 }}
                    />
                    Run completes ✅
                  </label>
                  <label style={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={editState.notifyOnFail}
                      onChange={(e) => setEditState({ ...editState, notifyOnFail: e.target.checked })}
                      disabled={!editState.enabled}
                      style={{ marginRight: 8 }}
                    />
                    Run fails ❌
                  </label>
                  <label style={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={editState.notifyOnBlocked}
                      onChange={(e) => setEditState({ ...editState, notifyOnBlocked: e.target.checked })}
                      disabled={!editState.enabled}
                      style={{ marginRight: 8 }}
                    />
                    Agent gets blocked ⚠️
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div style={styles.actions}>
                <button onClick={handleSave} disabled={saving} style={styles.primaryBtn}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleTest}
                  disabled={testing || !editState.chatId || !editState.enabled}
                  style={styles.secondaryBtn}
                >
                  {testing ? "Sending..." : "Send Test"}
                </button>
              </div>

              {message && (
                <div style={message.type === "success" ? styles.successBox : styles.errorBox}>
                  {message.text}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Setup guide */}
      <div style={styles.guide}>
        <strong>Quick Setup</strong>
        <ol style={{ paddingLeft: 20, marginTop: 8, fontSize: 13 }}>
          <li>Create a bot with <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" style={styles.link}>@BotFather</a> and copy the token.</li>
          <li>Go to <strong>Settings → Plugins → Telegram Notifications</strong> and paste the Bot Token.</li>
          <li>Select an agent above, enter your Chat ID, and click <strong>Save</strong>.</li>
          <li>Click <strong>Send Test</strong> to verify.</li>
        </ol>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: "24px 32px", fontFamily: "inherit", maxWidth: 900 },
  header: { marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 700, margin: "0 0 4px 0" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: 0 },
  botBadge: {
    marginLeft: 10, fontSize: 12, background: "#dcfce7", color: "#166534",
    padding: "2px 8px", borderRadius: 999, fontWeight: 500,
  },
  layout: { display: "flex", gap: 24, marginBottom: 24 },
  sidebar: {
    width: 200, flexShrink: 0,
    border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden",
  },
  sidebarTitle: {
    fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase",
    padding: "10px 12px", borderBottom: "1px solid #f3f4f6", margin: 0,
  },
  agentRow: {
    padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #f3f4f6",
    transition: "background 0.1s",
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
  checkboxGroup: { display: "flex", flexDirection: "column" as const, gap: 8 },
  input: {
    width: "100%", padding: "8px 12px", fontSize: 13,
    border: "1px solid #d1d5db", borderRadius: 6, boxSizing: "border-box" as const,
  },
  hint: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  actions: { display: "flex", gap: 8, marginBottom: 12 },
  primaryBtn: {
    padding: "8px 16px", fontSize: 13, fontWeight: 500,
    background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer",
  },
  secondaryBtn: {
    padding: "8px 16px", fontSize: 13, fontWeight: 500,
    background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db",
    borderRadius: 6, cursor: "pointer",
  },
  successBox: {
    padding: "10px 14px", background: "#d1fae5", color: "#065f46",
    borderRadius: 6, fontSize: 13,
  },
  errorBox: {
    padding: "10px 14px", background: "#fee2e2", color: "#991b1b",
    borderRadius: 6, fontSize: 13,
  },
  guide: {
    padding: 16, background: "#f0f9ff", borderRadius: 8, fontSize: 13, color: "#0c4a6e",
  },
  link: { color: "#2563eb" },
  muted: { color: "#9ca3af", fontSize: 13, padding: 12 },
};
