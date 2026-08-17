---
name: Macro action
about: One unit of agent work — sized for a single fresh session, verified by VALIDATION, not by narrative.
title: "feat: <observable outcome>"
labels: macro-action
---

<!-- mode: afk (agent runs unattended, all layers, observable result) | hitl (human in the loop) -->
mode: hitl
blocked_by: []
milestone: 0001

## CONTEXT (why)
Working on <milestone/feature> for <whom>. This result enables <what>.

## WHAT
<Observable outcome, not a list of files. Vertical slice: cut all layers to something a user can see.>

## CONSTRAINTS
- No features/refactors/abstractions beyond scope. Simplest thing that works well.
- Follow the blessed path: <docs/blessed-paths/…>
- <project-specific limits>

## VALIDATION (runnable — the only definition of done)
- `pnpm verify` → 0
- <specific runnable check for this task, e.g. `pnpm -F @chrome-bookmarks-mcp/server test -- <name>`>
- <observable behaviour, e.g. `bookmarks_status` reports `bridge: connected`>

## OUT OF SCOPE
- <what we deliberately don't do and where the boundary is>

## Decisions needed from Artem (Non-RL input)
- <domain choices the agent must not make alone; empty = none>

## Session journal (append per session: SHA · `pnpm verify` exit code · decisions · verifier verdict)
-
