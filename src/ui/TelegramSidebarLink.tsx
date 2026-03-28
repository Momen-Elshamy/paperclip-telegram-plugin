import React from "react";
import { useHostContext } from "@paperclipai/plugin-sdk/ui/hooks";

export function TelegramSidebarLink() {
  const { company, navigate } = useHostContext();
  const companyPrefix = company?.issuePrefix;

  const handleClick = () => {
    if (companyPrefix && navigate) {
      navigate(`/${companyPrefix}/telegram`);
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "6px 12px",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 13,
        color: "inherit",
        textAlign: "left",
        borderRadius: 6,
      }}
    >
      <span>📬</span>
      <span>Telegram</span>
    </button>
  );
}
