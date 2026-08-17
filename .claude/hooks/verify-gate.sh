#!/usr/bin/env bash
# Stop hook: a turn that changed source may not end with a red `pnpm verify`.
# - Skips when nothing relevant is dirty (chat-only turns stay fast).
# - stop_hook_active + attempt counter prevent an infinite fix loop: after 3 consecutive
#   failed attempts we let the turn end so the human sees the failure.
set -u
input=$(cat)
root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$root" || exit 0

changed=$(git status --porcelain -- 'packages/**' 'package.json' 'pnpm-workspace.yaml' 'biome.json' 'tsconfig*.json' 2>/dev/null | wc -l | tr -d ' ')
[ "$changed" = "0" ] && exit 0

counter=".claude/.verify-attempts"
active=$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)
n=0; [ -f "$counter" ] && n=$(cat "$counter")
if [ "$active" = "true" ] && [ "$n" -ge 3 ]; then
  echo "verify-gate: 3 failed attempts — letting the turn end; report the failure explicitly." >&2
  rm -f "$counter"; exit 0
fi

# wall-clock bound comes from settings.json hook `timeout` (macOS has no coreutils `timeout`)
out=$(pnpm verify 2>&1); code=$?
if [ $code -eq 0 ]; then rm -f "$counter"; exit 0; fi

echo $((n+1)) > "$counter"
echo "verify-gate: pnpm verify failed (exit $code). Fix before finishing; do not weaken tests." >&2
echo "$out" | grep -E 'error TS|FAIL|✗|×|Error|lint/|failed' | head -40 >&2
exit 2
