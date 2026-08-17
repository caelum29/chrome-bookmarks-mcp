#!/usr/bin/env bash
# PostToolUse (Edit|Write): format the touched file, then typecheck ONLY its pnpm package.
# The agent sees type errors in the same turn (exit 2 → stderr fed back); a full-workspace check on
# every edit is the classic "hook too slow" failure, so scope is one package.
set -u
input=$(cat)
path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
[ -z "$path" ] && exit 0
case "$path" in *.ts|*.tsx|*.mts|*.js|*.mjs|*.json) ;; *) exit 0 ;; esac
[ -f "$path" ] || exit 0

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$root" || exit 0

# format quietly; never block on formatting
if [ -x node_modules/.bin/biome ]; then
  node_modules/.bin/biome format --write "$path" >/dev/null 2>&1 || true
fi

case "$path" in
  *.ts|*.tsx|*.mts) ;;
  *) exit 0 ;;
esac

pkg=""
case "$path" in
  "$root"/packages/mcp-server/*) pkg="@chrome-bookmarks-mcp/server" ;;
  "$root"/packages/extension/*)  pkg="@chrome-bookmarks-mcp/extension" ;;
esac
[ -z "$pkg" ] && exit 0

# tsc/vitest print to stdout; only stderr reaches the agent on exit 2 → redirect
out=$(pnpm -F "$pkg" typecheck 2>&1)
if [ $? -ne 0 ]; then
  echo "typecheck failed in $pkg after editing ${path#"$root"/}:" >&2
  echo "$out" | grep -E 'error TS' | head -30 >&2
  exit 2
fi
exit 0
