// src/ui/TelegramSidebarLink.tsx
import { useHostContext } from "@paperclipai/plugin-sdk/ui/hooks";
import { jsx, jsxs } from "react/jsx-runtime";
function TelegramSidebarLink() {
  const { company, navigate } = useHostContext();
  const companyPrefix = company?.issuePrefix;
  const handleClick = () => {
    if (companyPrefix && navigate) {
      navigate(`/${companyPrefix}/telegram`);
    }
  };
  return /* @__PURE__ */ jsxs(
    "button",
    {
      onClick: handleClick,
      style: {
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
        borderRadius: 6
      },
      children: [
        /* @__PURE__ */ jsx("span", { children: "\u{1F4EC}" }),
        /* @__PURE__ */ jsx("span", { children: "Telegram" })
      ]
    }
  );
}
export {
  TelegramSidebarLink
};
//# sourceMappingURL=TelegramSidebarLink.js.map
