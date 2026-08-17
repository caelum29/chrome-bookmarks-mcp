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

## Later the same day
- Committed on `feat/harness-bootstrap`: `eaf175b` docs · `d3e03ca` harness · `c148e2e` server ·
  `e3a8656` extension · `f56db08` make verify.
- **DoD 3 verified**: extension loaded unpacked in Chrome → `bookmarks_status` → `bridge: connected (v0.1.0)`
  (poll script, server stderr `bridge: extension connected`).
- `/code-review` (Standards + Spec, two fresh-context agents) → fixes committed after review:
  zod validation of bridge frames (`BridgeResponseSchema`) and of the raw Bookmarks file (`RawFileSchema`);
  `BOOKMARKS_LOG_LEVEL` / `BOOKMARKS_BRIDGE_TIMEOUT_MS` validated in `loadConfig`; new bridge state
  `unavailable` (port never bound) + `BridgeClient.listening`; remote ping error = connected-but-failing;
  extension port configurable via `chrome.storage.local.wsPort` (+ `storage` permission), status warns on
  mismatch; `bookmarks_tree` description no longer names a future tool, `roots` typed one level;
  CONTEXT.md +outline/bridge state/source; blessed paths fixed; README reads claim corrected;
  `unixMsToWebkit` removed (unused); hook commands via `$CLAUDE_PROJECT_DIR`; test file headers.
  `pnpm verify` → 0 (35 tests).
- ADR-0004 trigger "**>2 files in `.claude/rules/`**" fired at birth (3 files) → issue to open
  (`test_map.md` + `InstructionsLoaded` audit hook); GitHub API was 503 at the time — see OQ-7 if the
  issue is still missing.

## Not done
- PR not opened yet (DoD 4 needs CI on the PR).
- Verifier subagent against milestone DoD — run before marking the PR ready.
