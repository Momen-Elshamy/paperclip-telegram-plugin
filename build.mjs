import * as esbuild from "esbuild";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));

const sharedOptions = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: true,
};

// Build worker
await esbuild.build({
  ...sharedOptions,
  entryPoints: ["src/worker.ts"],
  outfile: "dist/worker.js",
  external: ["@paperclipai/plugin-sdk"],
  logLevel: "info",
});

// Build manifest
await esbuild.build({
  ...sharedOptions,
  entryPoints: ["src/manifest.ts"],
  outfile: "dist/manifest.js",
  bundle: false,
  logLevel: "info",
});

// Build UI (browser target) - settings page
await esbuild.build({
  entryPoints: ["src/ui/TelegramSettingsPage.tsx"],
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2020",
  outfile: "dist/ui/TelegramSettingsPage.js",
  external: ["react", "react-dom", "react/jsx-runtime", "@paperclipai/plugin-sdk"],
  jsx: "automatic",
  logLevel: "info",
  sourcemap: true,
});

// Build UI - sidebar link
await esbuild.build({
  entryPoints: ["src/ui/TelegramSidebarLink.tsx"],
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2020",
  outfile: "dist/ui/TelegramSidebarLink.js",
  external: ["react", "react-dom", "react/jsx-runtime", "@paperclipai/plugin-sdk"],
  jsx: "automatic",
  logLevel: "info",
  sourcemap: true,
});

// Build UI index that re-exports all components
import { writeFileSync } from "fs";
writeFileSync("dist/ui/index.js", `
export { TelegramSettingsPage } from './TelegramSettingsPage.js';
export { TelegramSidebarLink } from './TelegramSidebarLink.js';
`);

console.log("✅ Build complete");
