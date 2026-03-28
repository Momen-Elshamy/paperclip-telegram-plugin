/**
 * TelegramSettingsPage — page slot component.
 * Paperclip renders this at /<companyPrefix>/telegram
 */
import React, { useState, useEffect } from "react";
import { usePluginData, usePluginAction, useHostContext } from "@paperclipai/plugin-sdk/ui/hooks";
import type { PluginPageProps } from "@paperclipai/plugin-sdk/ui/types";

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

export function TelegramSettingsPage({ context }: PluginPageProps) {
  const companyId = context.companyId;

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

  useEffect(() => {
    getBotInfo({})
      .then((info: unknown) => setBotInfo(info as { username: string }))
      .catch(() => setBotInfo(null));
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
    return <div style={s.container}><p style={s.muted}>Loading...</p></div>;
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.title}>📬 Telegram Notifications</h1>
        <p style={s.subtitle}>
          Configure which agents send Telegram messages and when.
          {botInfo && <span style={s.botBadge}>Connected: @{botInfo.username}</span>}
        </p>
      </div>

      <div style={s.layout}>
        {/* Agent List */}
        <div style={s.agentList}>
          <div style={s.listHeader}>Agents</div>
          {(!agents || agents.length === 0) ? (
            <p style={s.muted}>No agents found</p>
          ) : agents.map((agent) => {
            const cfg = allConfigs?.[agent.id];
            const active = cfg?.enabled && !!cfg?.chatId;
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                style={{ ...s.agentRow, ...(selectedAgentId === agent.id ? s.agentRowActive : {}) }}
              >
                <div style={s.agentName}>{agent.name}</div>
                <div style={s.agentRole}>
                  {agent.role}
                  {active && <span style={s.activeDot}>●</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Config Panel */}
        <div style={s.panel}>
          {!selectedAgentId ? (
            <div style={s.empty}>← Select an agent to configure Telegram</div>
          ) : (
            <>
              <h2 style={s.agentTitle}>{selectedAgent?.name}</h2>

              <div style={s.field}>
                <label style={s.checkLabel}>
                  <input type="checkbox" checked={editState.enabled}
                    onChange={e => setEditState({ ...editState, enabled: e.target.checked })}
                    style={{ marginRight: 8 }} />
                  Enable Telegram notifications
                </label>
              </div>

              <div style={s.field}>
                <label style={s.label}>Telegram Chat ID</label>
                <input type="text" value={editState.chatId || ""}
                  onChange={e => setEditState({ ...editState, chatId: e.target.value })}
                  placeholder="e.g. 991432117"
                  style={s.input} disabled={!editState.enabled} />
                <p style={s.hint}>
                  Message <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" style={s.link}>@userinfobot</a> on Telegram to find your Chat ID.
                </p>
              </div>

              <div style={s.field}>
                <label style={s.label}>Notify me when:</label>
                <div style={s.checkGroup}>
                  {[
                    { key: "notifyOnComplete", label: "Run completes ✅" },
                    { key: "notifyOnFail", label: "Run fails ❌" },
                    { key: "notifyOnBlocked", label: "Agent gets blocked ⚠️" },
                  ].map(({ key, label }) => (
                    <label key={key} style={s.checkLabel}>
                      <input type="checkbox"
                        checked={editState[key as keyof AgentTelegramConfig] as boolean}
                        onChange={e => setEditState({ ...editState, [key]: e.target.checked })}
                        disabled={!editState.enabled}
                        style={{ marginRight: 8 }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={s.actions}>
                <button onClick={handleSave} disabled={saving} style={s.primaryBtn}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button onClick={handleTest} disabled={testing || !editState.chatId || !editState.enabled} style={s.secondaryBtn}>
                  {testing ? "Sending..." : "Send Test"}
                </button>
              </div>

              {message && (
                <div style={message.type === "success" ? s.success : s.error}>{message.text}</div>
              )}
            </>
          )}
        </div>
      </div>

      <div style={s.guide}>
        <strong>Setup:</strong> Go to{" "}
        <strong>Settings → Plugins → Telegram Notifications</strong> to set your Bot Token, then configure each agent above.
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { padding: "24px 32px", fontFamily: "inherit", maxWidth: 860 },
  header: { marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 700, margin: "0 0 4px 0" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: 0 },
  botBadge: { marginLeft: 10, fontSize: 12, background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 999, fontWeight: 500 },
  layout: { display: "flex", gap: 20, marginBottom: 20 },
  agentList: { width: 190, flexShrink: 0, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" },
  listHeader: { fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase" as const, padding: "8px 12px", borderBottom: "1px solid #f3f4f6" },
  agentRow: { padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #f9fafb" },
  agentRowActive: { background: "#eff6ff" },
  agentName: { fontSize: 13, fontWeight: 500, color: "#111827" },
  agentRole: { fontSize: 11, color: "#9ca3af", marginTop: 2, display: "flex", alignItems: "center", gap: 4 },
  activeDot: { color: "#22c55e", fontSize: 10 },
  panel: { flex: 1, border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 },
  empty: { color: "#9ca3af", fontSize: 13, padding: "40px 0", textAlign: "center" as const },
  agentTitle: { fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "#374151" },
  checkLabel: { display: "flex", alignItems: "center", fontSize: 13, color: "#374151", cursor: "pointer" },
  checkGroup: { display: "flex", flexDirection: "column" as const, gap: 8 },
  input: { width: "100%", padding: "8px 12px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 6, boxSizing: "border-box" as const },
  hint: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  actions: { display: "flex", gap: 8, marginBottom: 12, marginTop: 16 },
  primaryBtn: { padding: "8px 16px", fontSize: 13, fontWeight: 500, background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" },
  secondaryBtn: { padding: "8px 16px", fontSize: 13, fontWeight: 500, background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer" },
  success: { padding: "10px 14px", background: "#d1fae5", color: "#065f46", borderRadius: 6, fontSize: 13 },
  error: { padding: "10px 14px", background: "#fee2e2", color: "#991b1b", borderRadius: 6, fontSize: 13 },
  guide: { padding: 14, background: "#f0f9ff", borderRadius: 8, fontSize: 13, color: "#0c4a6e" },
  link: { color: "#2563eb" },
  muted: { color: "#9ca3af", fontSize: 13, padding: 12 },
};
