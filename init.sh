#!/usr/bin/env bash
# Fresh-session bootstrap: deps, build, smoke. Agents run this instead of rediscovering the setup.
# Prints one line per step with its exit code; last line is the overall verdict.
set -u
cd "$(dirname "$0")" || exit 1

step() { local name="$1"; shift; "$@" >/dev/null 2>&1; local c=$?; printf '%-28s exit %s\n' "$name" "$c"; return $c; }

need_node=$(cat .nvmrc 2>/dev/null || echo 22)
node -v | grep -q "^v${need_node}" || echo "warn: .nvmrc wants Node ${need_node}, have $(node -v)"

step "pnpm install (offline-first)" pnpm install --prefer-offline --frozen-lockfile || exit 1
step "typecheck"                     pnpm typecheck || exit 1
step "build server + extension"      pnpm build || exit 1
step "smoke: server module loads"    node -e "import('./packages/mcp-server/dist/server.js').then(m=>{if(typeof m.createServer!=='function')process.exit(1)})" || exit 1

echo "ready · verify with: pnpm verify · active milestone: $(grep -l 'Status: \*\*active\*\*' docs/milestones/*.md 2>/dev/null | head -1)"
