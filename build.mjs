import * as esbuild from "esbuild";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
const isWatch = process.argv.includes("--watch");

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

// Build UI (browser target)
await esbuild.build({
  entryPoints: ["src/ui/AgentTelegramTab.tsx"],
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2020",
  outfile: "dist/ui/AgentTelegramTab.js",
  external: ["react", "react-dom", "@paperclipai/plugin-sdk"],
  jsx: "automatic",
  logLevel: "info",
  sourcemap: true,
});

// Build manifest (separate bundle, not minified)
await esbuild.build({
  ...sharedOptions,
  entryPoints: ["src/manifest.ts"],
  outfile: "dist/manifest.js",
  bundle: false,
  logLevel: "info",
});

console.log("✅ Build complete");
