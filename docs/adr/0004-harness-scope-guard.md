# ADR-0004: Minimal harness on day 0; deferred tooling has explicit adoption triggers
Date: 2026-08-17 · Status: accepted

## Context
The most common failure of harness-building is over-engineering, not under-engineering. This repo
starts with the day-0 minimum (verify loop, permissions + hooks, docs trust hierarchy, verifier
subagent, macro-action issues) and grows by ratchet: an agent mistake becomes an invariant → hook →
rule, in that order of preference. Everything below is **forbidden until its trigger fires**, even if
"small".

## Decision — deferred tooling and its trigger (no dates)

| Tool / practice | Adopt when | Designated attach point |
|---|---|---|
| Release pipeline (npm OIDC provenance → `.mcpb` → MCP Registry) | first milestone whose tools a stranger could use (`tree`, `search`, `plan`, `apply`, `rollback`) | `docs/blessed-paths/release.md`; `.github/workflows/release.yml`; `manifest.json` + `server.json` |
| Companion `SKILL.md` shipped with the server | ≥5 tools, or one workflow explained twice in chat | `skills/chrome-bookmarks-mcp/SKILL.md` |
| Git worktrees + `wt.sh` + `.worktreeinclude` | 2 independent issues in flight at once | `.claude/hooks/worktree-setup.sh` (`WorktreeCreate`) |
| `test_map.md` + `InstructionsLoaded` audit hook | >2 files in `.claude/rules/` or first regression missed by affected-typecheck | `.claude/settings.json` |
| Tool-selection eval + poisoning-resistance axis | first pair of confusable tools, or first description "diet" | `packages/mcp-server/test/eval/` |
| Conformance suite in CI | it documents stdio support | `.github/workflows/verify.yml` |
| Reviewer subagent with inlined standards | first PR merged with a standards violation the verifier missed | `.claude/agents/reviewer.md` |
| MCP Apps widget (tree/diff visualisation) | text answers demonstrably insufficient for plan review | resource + `_meta` on `plan_*` tools; text answer stays self-sufficient |
| beads / dependency graph | >30 open issues or 2+ agents | replaces `blocked_by` in issue template |
| Mutation testing (stryker) | first "coverage green, product broken" incident | `pnpm mutate` |
| Dynamic workflows (`ultracode`) | an audit across all tools that one context cannot hold | first target: input-validation / annotation audit per tool |
| Agent teams, GC agent, `@claude` Action | months of stable solo cycle | — |

## Consequences
- A PR that introduces a deferred item cites the fired trigger in its description, or is rejected.
- Deletion question at each milestone: a rule/hook that caught nothing since last milestone is removed.

## What the agent should do
- BEFORE proposing infrastructure: check this table; if listed and trigger not fired — don't.
- WHEN a trigger fires: open an issue citing this ADR row; the issue is the change, not a drive-by.
