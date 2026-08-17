#!/usr/bin/env bash
# SessionStart hook: inject repo state so a fresh session doesn't spend turns rediscovering it.
# stdout of a SessionStart hook is added to the agent's context.
set -u
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" || exit 0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
last=$(git log -1 --format='%h %s' 2>/dev/null || echo "no commits")
wip=$(git log -20 --format='%s' 2>/dev/null | grep -m1 '^wip' || true)
milestone=$(grep -l 'Status: \*\*active\*\*' docs/milestones/*.md 2>/dev/null | head -1)

echo "repo: chrome-bookmarks-mcp · branch: ${branch} · dirty files: ${dirty} · last: ${last}"
[ -n "$wip" ] && echo "unfinished handoff commit found: ${wip}"
[ -n "$milestone" ] && echo "active milestone: ${milestone}"
echo "proof of done: pnpm verify (exit 0). Bootstrap: ./init.sh. Recipes: docs/blessed-paths/."
exit 0
