// src/ui/TelegramSidebarLink.tsx
import { jsx, jsxs } from "react/jsx-runtime";
function TelegramSidebarLink({ context }) {
  const href = context.companyPrefix ? `/${context.companyPrefix}/telegram` : "/telegram";
  const isActive = typeof window !== "undefined" && window.location.pathname === href;
  return /* @__PURE__ */ jsxs(
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
