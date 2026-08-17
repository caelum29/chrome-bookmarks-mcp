# Blessed path: release (deferred — ADR-0004 trigger: first stranger-usable milestone)

Proven shape (calibre-mcp): `v*` tag → npm publish with OIDC provenance → `.mcpb` bundle → MCP Registry.
Zero secrets in the repo.

When the trigger fires, this file becomes the runbook and a `release` skill/subagent points at it:

1. Bump the version in every spot: `packages/mcp-server/package.json`, `manifest.json`, `server.json`
   (×2). Add a script that fails when they diverge.
2. `CHANGELOG.md` — Keep-a-Changelog, written for users.
3. `.github/workflows/release.yml` on `tags: ["v*"]`, `permissions: {id-token: write, contents: write}`:
   tag == package version guard → `pnpm install --frozen-lockfile` → `pnpm verify` → `npm publish
   --provenance --access public` (**no `registry-url` on setup-node** — it writes an empty `_authToken`
   that overrides OIDC; pin an npm version whose provenance resolves sigstore) → `pnpm pack:mcpb` →
   `gh release create --verify-tag --generate-notes` + upload `.mcpb` → `mcp-publisher login
   github-oidc && publish` with `server.json` version synced by `jq`.
4. `scripts/pack-mcpb.mjs`: stage `dist` + manifest/package/LICENSE/README into `build/mcpb`, real
   `npm install --omit=dev` there (pnpm symlinks don't zip), then `npx @anthropic-ai/mcpb pack`.
   `--dev` stamps `X.Y.(Z+1)-devHHMM` (short single identifier; Desktop silently replaces same-version).
5. Hard rules: never retag, never force-push, never edit `release.yml` during a release.
