# CLAUDE.md — chrome-bookmarks-mcp

pnpm workspace monorepo, TypeScript strict, Node ≥22.5. Public repo — no personal data, no real
bookmark dumps in fixtures. English everywhere in the repo; conversation with Artem in Ukrainian.

- `packages/mcp-server` — MCP server (stdio). SDK-free tool seam: only `src/server.ts` and
  `src/run-stdio.ts` import `@modelcontextprotocol/*`.
- `packages/extension` — MV3 service worker, esbuild → `dist/` (load unpacked). The only write path.

## Where things are (read on demand, don't preload)
`CONTEXT.md` = vocabulary, facts · `docs/adr/` = decisions, immutable · `docs/milestones/` = the one
active plan · `docs/open-questions.md` = unresolved · `docs/blessed-paths/` = recipes for recurring
task types (add tool, add bridge message, release) · `docs/sessions/` = journal.
**Never cite a plan or open question as a fact.**

## Invariants (each one paid for — see the ADR)
- **Never write the `Bookmarks` file.** Writes go through the extension via `chrome.bookmarks` (ADR-0002).
- **stdout is the MCP stream** — log only to stderr via `src/logging.ts`.
- Write tools: env-gated (`BOOKMARKS_ENABLE_WRITE`), `dryRun` default true, auto-snapshot, bounded sets;
  a dry run is a success result, not `isError` (ADR-0002).
- Handlers return `toolError(...)`, never throw for expected conditions; zod-coerce at the boundary;
  structured output on every tool; ≤ ~12 coarse tools (ADR-0003).
- `guid` is the stable key; `id` is local. Timestamps are WebKit epoch at the boundary, Unix ms inside.
- History DB is locked while Chrome runs — copy to temp, open read-only.

## How
- Verification: `pnpm verify` (typecheck + lint + test). The only accepted proof of "done".
- Non-trivial task → plan + unresolved-questions list first; code after the plan is approved.
- Add a tool / bridge message only via its blessed path.
- Validate at system boundaries only (tool input, bridge messages, file/DB reads); trust internal code.
- No features, refactors or abstractions beyond the task. When you have enough information to act, act.
- Never delete, skip, weaken or rewrite a failing test to make the suite pass — it is information;
  if a test looks wrong, stop and say so.
- Stop and ask only when: (a) the action is destructive/irreversible, (b) real scope change,
  (c) a domain decision only Artem can make. Otherwise continue. Unattended runs never end on a question.
- Before any progress report, check each claim against a tool result of this session; the proof is the
  `pnpm verify` exit code. Failing → show output; skipped → say so; done → state it plainly.
- Acceptance is by the fresh-context `verifier` subagent against the issue's VALIDATION — never self-accept.
- Commits: `type(scope): what (why)`; small, after every green step; end a session with a
  `wip(...) → next` commit if unfinished. Never push to main, never force-push, never amend pushed commits.

## Commands
`pnpm verify` · `pnpm typecheck` · `pnpm lint` (`pnpm lint:fix`) · `pnpm test` · `pnpm build` ·
`make ext` · `./init.sh` (fresh session bootstrap) · `pnpm -F @chrome-bookmarks-mcp/server inspect`

## AI attribution (Git AI)
Line-level attribution in git notes (`refs/notes/ai`), written by hooks on commit; nothing to do per
commit. `git ai stats`, `git log --show-notes=ai`. `.github/workflows/git-ai.yml` keeps notes through squash/rebase.
