# CLAUDE.md — chrome-bookmarks-mcp

pnpm workspace monorepo. Public repo — no personal data, no real bookmark dumps in fixtures.

- `packages/mcp-server` — MCP server (stdio), WS bridge, file-fallback reader, snapshots, History/SQLite.
- `packages/extension` — MV3 extension, esbuild → `dist/` (load unpacked).

## Invariants
- **Never write the `Bookmarks` file.** All writes go through the extension via `chrome.bookmarks`.
- **stdout is the MCP stream** — log only to stderr.
- `date_added` / `last_visit_time` are WebKit epoch (µs since 1601-01-01), not Unix.
- `guid` is the stable key; `id` is local. Snapshots/diffs are guid-keyed.
- Every write batch auto-snapshots first; destructive/batch tools default to `dryRun: true`.
- History DB is locked while Chrome runs — copy to temp, open read-only.

## Commands
`pnpm typecheck` · `pnpm test` · `pnpm build` · `make ext`

## Conventions
TypeScript strict, `verbatimModuleSyntax`, no `any` on public surfaces, vitest under `test/`,
conventional commits, English everywhere in the repo.
