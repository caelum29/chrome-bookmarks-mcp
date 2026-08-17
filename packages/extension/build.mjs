// Bundle the service worker with esbuild and copy manifest → dist/ (loadable unpacked).

import { cpSync, mkdirSync } from "node:fs";
import { build } from "esbuild";

mkdirSync("dist", { recursive: true });
await build({
  entryPoints: ["src/background.ts"],
  bundle: true,
  format: "esm",
  target: "chrome120",
  outfile: "dist/background.js",
});
cpSync("public", "dist", { recursive: true });
console.log("extension built → dist/");
