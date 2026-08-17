# chrome-bookmarks-mcp

> Work in progress — scaffold only. Tools land slice by slice.

An MCP server that gives Claude full read/write access to Chrome (and Brave/Edge) bookmarks
for agentic reorganization: tree analysis, folder-structure proposals, batch move/rename/delete
plans with snapshots and rollback, deduplication, dead-link detection, and stale-bookmark
detection via Chrome's History database.

## Architecture

```
Claude Desktop / Claude Code
        ⇅ stdio (MCP)
  packages/mcp-server   (Node.js / TypeScript)
        ⇅ WebSocket on 127.0.0.1:<PORT>   (localhost only)
  packages/extension    (Manifest V3 service worker)
        ⇅ chrome.bookmarks API
  Live Chrome — changes visible instantly, sync-safe
```

Writes go **only** through the extension (`chrome.bookmarks`); Chrome's `Bookmarks` file is
never written to. Reads use the extension when connected and fall back to parsing the
`Bookmarks` file otherwise.

## Development

```bash
pnpm install
pnpm typecheck && pnpm test && pnpm build
```

Load the extension: `chrome://extensions` → Developer mode → Load unpacked →
`packages/extension/dist`.

## AI attribution

AI-generated lines are tracked with [Git AI](https://usegitai.com) via git notes
(`git log --show-notes=ai`, `git ai stats`). No workflow changes required.

## License

MIT
