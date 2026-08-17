# Session 2026-08-17 — harness bootstrap + walking skeleton (milestone 0001, partial)

Rule of this file: no progress claim without a tool result. Exit codes are from this session.

## Done
- Docs trust hierarchy: `CONTEXT.md`, ADR-0001..0004, milestone-0001, open-questions OQ-1..6,
  blessed paths (add tool / add bridge message / release).
- Harness: `CLAUDE.md` rewrite (principle-level, ≤60 lines), `.claude/settings.json` (permissions +
  SessionStart / PreToolUse guard / PostToolUse affected-typecheck / Stop verify-gate hooks),
  agents `verifier` + `explorer`, path-scoped rules (mcp-server, extension, tests), `biome.json`,
  `pnpm verify`, `init.sh`, `.mcp.json`, CI `verify.yml`, macro-action issue template, PR template.
- Server: SDK-free seam (`tools/types.ts`, `define.ts`, `result.ts`, `coerce.ts`, `registry.ts` with
  boot invariants), `chrome/bookmarks-file.ts` (read-only), `chrome/webkit-time.ts`, `domain/tree.ts`,
  `bridge/protocol.ts` + `bridge/ws-bridge.ts`, tools `bookmarks_status`, `bookmarks_tree`.
- Extension: WS client with reconnect + alarms keepalive, `ping` dispatcher.
- Tests: 30 (handler SDK-free ×2 files, registry meta-test, file parser, ws round-trip, InMemoryTransport wire test, config).

## Evidence
- `pnpm verify` → exit 0 (typecheck ×2 Done, biome 38 files clean, 7 files / 30 tests passed).
- `./init.sh` → all steps exit 0.
- Level-2 hook check: `guard-paths.sh` blocks existing ADR edit (exit 2), blocks `it.skip` in test
  file (exit 2), passes normal src file (exit 0); `session-context.sh` prints branch/dirty/milestone;
  `typecheck-affected.sh` exit 0; `verify-gate.sh` exit 0 on green tree.
- stdio smoke against the real Default profile: `tools/list` → `["bookmarks_status","bookmarks_tree"]`;
  `bookmarks_tree {depth:"1"}` → `{"folders":17,"bookmarks":384,"maxDepth":3}`; process exits on stdin EOF.

## Bugs found by the loop
- Server never exited after client closed stdin (WS server kept the loop alive; SDK stdio transport
  does not watch EOF) → `process.stdin.on("end"/"close")` + `server.server.onclose` → shutdown.
- `limitParam` min defaulted to 1 → `depth: 0` impossible → min param, `depth` uses `min=0`.

## Decisions (see ADRs)
- SDK v1.x line kept; v2/2026-07-28 deferred behind the seam (ADR-0001, OQ-4).
- Release pipeline / skill / worktrees / evals deferred with triggers (ADR-0004).

## Not done (milestone 0001 remaining)
- DoD 3 (bridge `connected` with a real loaded extension) — implemented, **not** manually verified in
  Chrome this session. Do: `make ext` → load unpacked → `bookmarks_status`.
- Verifier subagent run against milestone DoD before the PR is marked ready.
- Nothing committed yet — split suggested: `docs:` (trust hierarchy) · `chore(harness):` ·
  `feat(server):` skeleton · `feat(extension):` bridge client.
