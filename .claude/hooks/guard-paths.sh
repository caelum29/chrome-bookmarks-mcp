#!/usr/bin/env bash
# PreToolUse guard for Edit|Write: makes the repo's hard rules impossible, not merely "forbidden".
#   - existing ADRs are immutable (supersede with a new ADR)
#   - .env* never edited by the agent
#   - Chrome's Bookmarks / History files never written (ADR-0002)
#   - test tampering: no .skip/.only/xit/xdescribe introduced into test files
# exit 2 blocks the call and returns stderr to the agent as feedback.
set -u
input=$(cat)
path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
[ -z "$path" ] && exit 0

block() { echo "BLOCKED by .claude/hooks/guard-paths.sh: $1" >&2; exit 2; }

case "$path" in
  */docs/adr/*.md)
    [ -f "$path" ] && block "ADRs are immutable — write a new ADR that supersedes $(basename "$path")"
    ;;
  */.env|*/.env.*)
    block "never edit .env files; put config in docs and let the human set secrets"
    ;;
  */Bookmarks|*/Bookmarks.bak|*/History|*/History-journal)
    block "Chrome profile files are never written by this project (ADR-0002); use the bridge"
    ;;
esac

case "$path" in
  *.test.ts|*.spec.ts)
    new=$(printf '%s' "$input" | jq -r '.tool_input.content // .tool_input.new_string // empty' 2>/dev/null)
    if printf '%s' "$new" | grep -qE '\b(it|test|describe)\.(skip|only)\(|\bx(it|test|describe)\('; then
      block "test tampering — do not introduce .skip/.only/xit into $(basename "$path"); fix the code or say the test is wrong"
    fi
    ;;
esac
exit 0
