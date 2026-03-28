/**
 * AgentTelegramTab — renders inside the agent settings page as a "Telegram" tab.
 *
 * Uses @paperclipai/plugin-sdk/ui hooks to communicate with the plugin worker.
 */
import React, { useState, useEffect } from "react";
import { usePluginData, usePluginAction, useHostContext } from "@paperclipai/plugin-sdk/ui/hooks";

interface TelegramConfig {
  enabled: boolean;
  chatId: string | null;
}

export function AgentTelegramTab() {
  const { agent } = useHostContext();
  const agentId = agent?.id;

  // Fetch current config from plugin worker
  const { data: config, loading, refresh } = usePluginData<TelegramConfig>(
    "agent-telegram-config",
    { agentId },
    { skip: !agentId }
  );

  const [chatId, setChatId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync state when config loads
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
    return <div style={styles.container}><p style={styles.muted}>Loading...</p></div>;
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Telegram Integration</h3>
      <p style={styles.description}>
        Connect this agent to Telegram. The agent will send notifications when runs finish,
        and can receive messages you send via Telegram.
      </p>

      {/* Enable toggle */}
      <div style={styles.field}>
        <label style={styles.label}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Enable Telegram notifications
        </label>
      </div>

      {/* Chat ID input */}
      <div style={styles.field}>
        <label style={styles.label}>Telegram Chat ID</label>
        <input
          type="text"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          placeholder="e.g. 991432117"
          style={styles.input}
          disabled={!enabled}
        />
        <p style={styles.hint}>
          Your personal Chat ID or a group Chat ID. Send a message to{" "}
          <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" style={styles.link}>
            @userinfobot
          </a>{" "}
          on Telegram to find your ID.
        </p>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button onClick={handleSave} disabled={saving} style={styles.primaryBtn}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={handleTest} disabled={testing || !chatId} style={styles.secondaryBtn}>
          {testing ? "Sending..." : "Send Test Message"}
        </button>
      </div>

      {/* Feedback message */}
      {message && (
        <div style={message.type === "success" ? styles.successBox : styles.errorBox}>
          {message.text}
        </div>
      )}

      {/* Setup instructions */}
      <div style={styles.infoBox}>
        <strong>Setup Instructions</strong>
        <ol style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Create a bot with <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" style={styles.link}>@BotFather</a> on Telegram and copy the token.</li>
          <li>Go to <strong>Plugin Settings</strong> (instance-level) and paste the Bot Token.</li>
          <li>Enter your Chat ID above and click <strong>Save</strong>.</li>
          <li>Click <strong>Send Test Message</strong> to verify the connection.</li>
        </ol>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: "24px", maxWidth: 480, fontFamily: "inherit" },
  heading: { fontSize: 16, fontWeight: 600, marginBottom: 4, marginTop: 0 },
  description: { fontSize: 13, color: "#6b7280", marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "#374151" },
  input: {
    width: "100%", padding: "8px 12px", fontSize: 13,
    border: "1px solid #d1d5db", borderRadius: 6,
    boxSizing: "border-box" as const,
  },
  hint: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  actions: { display: "flex", gap: 8, marginBottom: 16 },
  primaryBtn: {
    padding: "8px 16px", fontSize: 13, fontWeight: 500,
    background: "#2563eb", color: "#fff", border: "none",
    borderRadius: 6, cursor: "pointer",
  },
  secondaryBtn: {
    padding: "8px 16px", fontSize: 13, fontWeight: 500,
    background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db",
    borderRadius: 6, cursor: "pointer",
  },
  successBox: {
    padding: "10px 14px", background: "#d1fae5", color: "#065f46",
    borderRadius: 6, fontSize: 13, marginBottom: 16,
  },
  errorBox: {
    padding: "10px 14px", background: "#fee2e2", color: "#991b1b",
    borderRadius: 6, fontSize: 13, marginBottom: 16,
  },
  infoBox: {
    padding: "14px", background: "#f0f9ff", borderRadius: 6,
    fontSize: 13, color: "#0c4a6e", marginTop: 8,
  },
  link: { color: "#2563eb" },
  muted: { color: "#9ca3af", fontSize: 13 },
};

export default AgentTelegramTab;
