# CONTEXT.md — ubiquitous language

Normative tier: **facts only**. A term used in any ADR, milestone, tool description or type name
must appear here first (same commit). Anything not listed here is not a project term.

## 0. Disambiguation — overloaded words

| Word | In this repo means | NOT |
|---|---|---|
| **id** | Chrome-local numeric node id (`"12"`); differs across profiles/machines | a stable key — that is `guid` |
| **snapshot** | Server-side JSON dump of the full tree, guid-keyed, taken before every write batch | Chrome sync backup, git snapshot |
| **plan** | A `bookmarks_plan_*` output: proposed ops the user reviews before `apply` | milestone / roadmap (docs tier) |
| **profile** | Chrome user-data profile dir (`Default`, `Profile 1`) | Claude profile, extension profile |
| **bridge** | The MV3 extension + its WebSocket link to the server | the MCP transport (stdio) |
| **write** | Any mutation of live bookmarks (`chrome.bookmarks.*` via bridge) | writing snapshots/logs to `~/.cache` — that is a *local write* |
| **stale** | Bookmark whose URL has no History visit within `staleAfterDays` | dead (unreachable) — different check |

## 1. Bookmark tree

**Node**: one entry in the tree — either a folder or a URL bookmark. Fields: `id`, `guid`, `parentId`, `index`, `title`, `url?`, `dateAdded`, `dateModified?`.
_Avoid_: item, entry, link (ambiguous).

**Folder**: node without `url`; owns ordered children.
_Avoid_: directory, group.

**Root folders**: the three fixed Chrome roots — `bookmark_bar`, `other`, `synced` (mobile). They cannot be moved, renamed or deleted.

**guid**: Chrome's stable per-node UUID; survives sync and re-import. The only key snapshots, diffs and plans use.
_Avoid_: uuid, key.

**WebKit epoch**: timestamps in the `Bookmarks` file and History DB — microseconds since 1601-01-01 UTC. Convert at the boundary; the domain uses Unix ms.

## 2. Data sources

**Bookmarks file**: `<userDataDir>/<profile>/Bookmarks` JSON. Read-only fallback source when the bridge is down. **Never written by this project.**

**History DB**: `<userDataDir>/<profile>/History` SQLite. Locked while Chrome runs → copy to temp, open read-only. Source for `stale` detection.

**Bridge**: MV3 service worker holding a WebSocket to `127.0.0.1:<wsPort>`; the only write path; preferred read path when connected.

**Bridge state** (as reported by `bookmarks_status`): `connected` (ping round-trip ok) · `disconnected` (server listens, no extension) · `unresponsive` (extension attached but did not answer in time) · `unavailable` (server could not bind the port — the extension can never connect).

**Source**: where a read tool got its data — `file` (Bookmarks file) or `bridge` (live). Every read result names its source.

## 3. Operations

**Read tool**: `readOnlyHint: true`; works with either source; never mutates.

**Outline**: the depth-limited folder-only view of the tree with per-folder counts (`bookmarkCount`, `folderCount`, `totalBookmarks`) — what `bookmarks_tree` returns. No URLs.

**Write tool**: mutates live bookmarks through the bridge. Every write tool: (a) is disabled unless `BOOKMARKS_ENABLE_WRITE` is set, (b) defaults to `dryRun: true`, (c) auto-snapshots before applying.

**Local write**: server-owned files under `~/.cache/chrome-bookmarks-mcp/` (snapshots). Ungated by design; never touches Chrome.

**dryRun**: `true` → return the exact ops that *would* run, as a success result. `false` → apply. A dry run is requested information, not a refused action — it is never `isError`.

**Plan**: ordered list of ops `{op: move|rename|delete|create, guid, …}` produced by a `plan_*` tool, consumed by `apply_plan`. Plans are data, not intent.

**Dedupe**: same normalized URL (scheme/host lowercased, tracking params stripped, trailing slash trimmed) in ≥2 nodes.

**Dead link**: URL that fails a HEAD/GET probe (network-dependent; opt-in tool).

## 4. Harness terms

**verify**: `pnpm verify` = typecheck + lint + test. The only accepted proof of "done" in this repo.

**Verifier**: fresh-context subagent (`.claude/agents/verifier.md`) that grades work against an issue's VALIDATION section. Never the session that wrote the code.

**Macro action**: one GitHub issue sized for one fresh session — CONTEXT / WHAT / CONSTRAINTS / VALIDATION / OUT OF SCOPE.

## Maintenance

- New term in a normative doc → line here in the same commit.
- Deletion question each milestone: a term no code or doc uses gets removed.
