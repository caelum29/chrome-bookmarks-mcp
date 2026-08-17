---
paths: ["packages/extension/**"]
---
# Extension rules (MV3)
- Service worker is ephemeral: no in-memory state that must survive; reconnect on wake; keepalive via
  `chrome.alarms`, not `setInterval`.
- Connect only to `ws://127.0.0.1:<port>`; never a remote host. No remote code, no `eval` (MV3 CSP).
- Permissions stay `bookmarks` + `alarms` unless a bridge message provably needs more; a manifest
  change is reviewed twice.
- Message dispatch: one `switch` on `method`; each case calls `chrome.bookmarks.*` and returns plain
  JSON; errors as `{ error: { message } }` — never throw across the socket.
- New message → `docs/blessed-paths/add-bridge-message.md`; contract lives server-side in
  `packages/mcp-server/src/bridge/protocol.ts`.
- Build with `make ext`; test manually by reloading the unpacked extension and calling `bookmarks_status`.
