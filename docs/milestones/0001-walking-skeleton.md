# Milestone 0001 — Walking skeleton
Status: **active** (exactly one milestone is active at a time) · Tier: plan / aspiration — do not cite as fact.

## Goal
Prove the whole pipe end to end with the thinnest possible slice: Claude → stdio → server → (bridge | file
fallback) → answer, and docs → plan → code → verify → PR → CI → merge as the working factory.

## DoD (externally observable)
1. In Claude Desktop/Code with `.mcp.json` from this repo, the user asks *"what's the state of my
   bookmarks bridge?"* → `bookmarks_status` answers with browser, profile, whether the `Bookmarks` file
   was found, whether the bridge is connected, and whether writes are enabled.
2. The user asks *"show me my bookmark folders"* → `bookmarks_tree` returns the folder tree (depth-limited,
   counts per folder) from the **file fallback** with Chrome closed or the extension not loaded.
3. With the unpacked extension loaded, `bookmarks_status` reports `bridge: connected` (round-trip `ping`
   over the localhost WebSocket).
4. `pnpm verify` → exit 0 locally; CI `verify` green on the PR; handler tests are SDK-free; one
   client-level test drives the server through `InMemoryTransport`.
5. No write path exists yet — `BOOKMARKS_ENABLE_WRITE` has nothing to enable; the registry test asserts
   the write-tool set is empty.

## Author DoD
Artem can draw the request path (client → stdio → `server.ts` → registry → handler → source) from memory
and name the two files that import the SDK.

## Out of scope
Search, dedupe, plans, apply, snapshots, History DB, dead links, release pipeline (ADR-0004).

## Next milestone candidates
0002 read surface (`search`, `stats`, `dedupe` report) · 0003 write path (`plan_*`, `apply_plan`,
`rollback`, snapshots) · 0004 History-based staleness · 0005 distribution.
