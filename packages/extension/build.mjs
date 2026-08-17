// Bundle the service worker with esbuild and copy manifest → dist/ (loadable unpacked).
import { build } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";

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
