# ADR-0002: Writes only through the bridge; two-key gate, dry-run default, auto-snapshot
Date: 2026-08-17 · Status: accepted

## Context
Bookmark writes are user-visible and sync to every device. Chrome's `Bookmarks` file is rewritten by
Chrome itself and by Sync; editing it corrupts state and is overwritten. Agents in loops will call
destructive tools with wrong arguments; the harness — not agent judgment — must make that safe.

## Decision
1. **Never write the `Bookmarks` file.** All mutations go through the extension via `chrome.bookmarks`.
   Enforced by: no `fs.write*` on the file path anywhere in `mcp-server` (rule + verifier check).
2. **Two-key write gate.** Key 1: env `BOOKMARKS_ENABLE_WRITE=1` — without it write tools are
   `.disable()`d and absent from `tools/list`. Key 2: per-call `dryRun: false` (default `true`).
3. **Dry run is success, not error.** `dryRun: true` returns the exact op list as `toolOk` with
   `structuredContent.ops`. Returning `isError` for a preview makes agents refuse the confirm step.
4. **Auto-snapshot before every write batch** to `~/.cache/chrome-bookmarks-mcp/snapshots/<iso>.json`
   (guid-keyed). `bookmarks_rollback <snapshotId>` restores. Snapshots are *local writes* — ungated.
5. **Bounded batches.** Any tool taking a set refuses "all bookmarks"; `MAX_BATCH` per op type.
6. **Roots are immutable.** Ops on `bookmark_bar`/`other`/`synced` are rejected at plan time with a
   message that says what to do instead.
7. **Boot-time invariant.** A tool with `readOnlyHint: false` that is neither `write` nor `localWrite`
   makes the server refuse to start. Registry test snapshots the exact set of write tools.

## Consequences
- Every write tool has the same shape (see `docs/blessed-paths/add-mcp-tool.md`); reviewers check the
  seven points above, not ad-hoc.
- Bridge down + write requested → `isError` with "open Chrome / load extension" remediation, never a
  fallback to the file.

## What the agent should do
- NEVER add a write tool without `write: true`, `dryRun` param, snapshot call, and a registry-test update.
- WHEN a write times out but may have landed: re-read and compare; report success with the diff — never
  report a committed write as failed.
- VALIDATION: `pnpm -F @chrome-bookmarks-mcp/server test -- registry` green; server boots with and
  without `BOOKMARKS_ENABLE_WRITE`.
