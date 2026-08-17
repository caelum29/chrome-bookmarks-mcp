---
paths: ["packages/mcp-server/**"]
---
# MCP server rules (ADR-0001, 0002, 0003)
- Only `src/server.ts` and `src/run-stdio.ts` import `@modelcontextprotocol/*`. Everything else is plain TS.
- New tool → `docs/blessed-paths/add-mcp-tool.md`. Descriptor via `defineTool`, registered in `src/tools/registry.ts`.
- Handlers: `toolOk`/`toolError` from `src/tools/result.ts`; never throw for expected conditions;
  error text says what broke and what to do next; no host paths in messages.
- Input: zod shapes with `src/tools/coerce.ts` helpers (`CoercedBool` — `"false"` must be false).
- Every tool: all four annotations, `outputSchema` + `structuredContent` + self-sufficient text.
- Write tools: `write: true`, `dryRun` default true (dry run = success result), snapshot before apply,
  bounded set, roots rejected. Local writes (snapshots) → `localWrite: true`.
- Deps come from `ToolDeps`; never `new`/`import` an adapter inside a handler.
- Logging: `src/logging.ts` → stderr only. `console.log` is a bug.
- WebKit epoch ↔ Unix ms conversion happens in `src/chrome/*` adapters only.
- Tests: handler tests SDK-free with fake deps (`test/helpers/deps.ts`); fixtures synthetic.
