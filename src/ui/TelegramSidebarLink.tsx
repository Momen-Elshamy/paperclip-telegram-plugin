import React from "react";
import type { PluginSidebarProps } from "@paperclipai/plugin-sdk/ui/types";

export function TelegramSidebarLink({ context }: PluginSidebarProps) {
  const href = context.companyPrefix
    ? `/${context.companyPrefix}/telegram`
    : "/telegram";

  const isActive =
    typeof window !== "undefined" &&
    window.location.pathname === href;

  return (
    <a
      href={href}
      aria-current={isActive ? "page" : undefined}
      style={{
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
        transition: "background 0.15s",
      }}
    >
      <span>📬</span>
      <span>Telegram</span>
    </a>
  );
}
