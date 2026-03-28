import * as esbuild from "esbuild";
import { writeFileSync, mkdirSync } from "fs";

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

// Build UI — single bundled index.js (all components)
mkdirSync("dist/ui", { recursive: true });
await esbuild.build({
  entryPoints: ["src/ui/index.tsx"],
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2020",
  outfile: "dist/ui/index.js",
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "@paperclipai/plugin-sdk",
    "@paperclipai/plugin-sdk/ui",
    "@paperclipai/plugin-sdk/ui/hooks",
    "@paperclipai/plugin-sdk/ui/types",
  ],
  jsx: "automatic",
  logLevel: "info",
  sourcemap: true,
});

console.log("✅ Build complete");
