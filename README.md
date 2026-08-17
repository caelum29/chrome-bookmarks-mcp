# chrome-bookmarks-mcp

> Work in progress — walking skeleton. Tools land slice by slice; see `docs/milestones/`.

An MCP server that gives Claude read/write access to Chrome (and Brave/Edge) bookmarks for agentic
reorganisation: tree analysis, folder-structure proposals, batch move/rename/delete plans with
snapshots and rollback, deduplication, dead-link detection, and stale-bookmark detection via Chrome's
History database.

## Architecture

```
Claude Desktop / Claude Code
        ⇅ stdio (MCP)
  packages/mcp-server   (Node.js / TypeScript, SDK-free tool seam)
        ⇅ WebSocket on 127.0.0.1:<PORT>   (localhost only)
  packages/extension    (Manifest V3 service worker)
        ⇅ chrome.bookmarks API
  Live Chrome — changes visible instantly, sync-safe
```

Writes go **only** through the extension (`chrome.bookmarks`); Chrome's `Bookmarks` file is never
written. Reads use the extension when connected and fall back to parsing the `Bookmarks` file.

## Tools

| Tool | Kind | What it answers |
|---|---|---|
| `bookmarks_status` | read | browser/profile, Bookmarks file found?, bridge connected?, writes enabled? |
| `bookmarks_tree` | read | folder outline with counts (no URLs), from roots or a folder guid, depth-limited |

Write tools (planned: `plan_*`, `apply_plan`, `rollback`) are hidden unless `BOOKMARKS_ENABLE_WRITE=1`;
each defaults to `dryRun: true` and snapshots first. See `docs/adr/0002-write-path-and-safety.md`.

## Quick start (Claude Code, from this repo)

```bash
pnpm install && pnpm build
```

`.mcp.json` in the repo root registers the server as `chrome-bookmarks`. Ask: *"what's the state of my
bookmarks bridge?"* → `bookmarks_status`. For live access load the extension: `chrome://extensions` →
Developer mode → Load unpacked → `packages/extension/dist`.

Config (env): `BOOKMARKS_BROWSER` (`chrome`|`brave`|`edge`) · `BOOKMARKS_PROFILE` (`Default`) ·
`BOOKMARKS_WS_PORT` (`48765`) · `BOOKMARKS_ENABLE_WRITE` · `BOOKMARKS_FILE` (override path) ·
`BOOKMARKS_LOG_LEVEL`.

## Development

```bash
./init.sh            # deps, typecheck, build, smoke
pnpm verify          # typecheck + lint + test — the only definition of "done"
make ext             # build the unpacked extension → packages/extension/dist
pnpm -F @chrome-bookmarks-mcp/server inspect   # MCP Inspector
```

How this repo is developed with agents: `CLAUDE.md` (rules), `CONTEXT.md` (vocabulary),
`docs/adr/` (decisions), `docs/milestones/` (the one active plan), `docs/blessed-paths/` (recipes),
`.claude/` (permissions, hooks, subagents, path-scoped rules).

## AI attribution

AI-generated lines are tracked with [Git AI](https://usegitai.com) via git notes
(`git log --show-notes=ai`, `git ai stats`).

## License

MIT
