/**
 * TelegramSidebarLink — sidebar slot component.
 * Paperclip renders this as a sidebar nav item and handles routing
 * to the page automatically based on routePath in the manifest.
 * The component just needs to render the label/icon.
 */
import React from "react";
import type { PluginSidebarProps } from "@paperclipai/plugin-sdk/ui/types";

export function TelegramSidebarLink({ context }: PluginSidebarProps) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
      <span>📬</span>
      <span>Telegram</span>
    </span>
  );
}
