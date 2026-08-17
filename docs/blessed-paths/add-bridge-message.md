# Blessed path: add a bridge message (server ⇄ extension)

1. **Contract first** — add the message to `packages/mcp-server/src/bridge/protocol.ts`: request
   `{ id, method: "<name>", params }` and its typed result. Keep params flat; the extension validates
   nothing beyond shape, so the server owns validation.
2. **Server side** — `src/bridge/ws-bridge.ts`: no per-message code; `bridge.request(method, params)`
   already correlates by `id` and times out (`BRIDGE_TIMEOUT_MS`). Callers live in tool deps
   (`deps.bridge`), never in handlers directly.
3. **Extension side** — `packages/extension/src/background.ts`: add a `case "<name>"` in the dispatcher
   that calls `chrome.bookmarks.*` and returns a plain JSON result; errors → `{ error: { message } }`.
   No new permissions unless the message needs them (manifest change = review it twice).
4. **Tests** — server: fake `deps.bridge` in the handler test; protocol: a round-trip test over
   `ws` on an ephemeral port in `test/bridge/ws-bridge.test.ts` (start server, connect a bare `ws`
   client that answers like the extension, assert correlation + timeout).
5. **Manual e2e** — `make ext` → reload unpacked extension → `bookmarks_status` shows `connected` →
   call the tool through MCP Inspector (`pnpm -F @chrome-bookmarks-mcp/server inspect`).
6. Update `CONTEXT.md` if a new term appears; `pnpm verify` → 0.
