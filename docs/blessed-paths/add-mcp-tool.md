# Blessed path: add an MCP tool

The one canonical way to add a tool. Deviations need an ADR. Pointers, not copies — read the files.

1. **Decide it deserves to exist** — ADR-0003: can an existing tool take one more param instead? Total
   surface stays ≤ ~12.
2. **Descriptor** — new file `packages/mcp-server/src/tools/bookmarks_<name>.ts` exporting
   `defineTool({...})` (see `src/tools/define.ts`, shape in `src/tools/types.ts`):
   - `name: "bookmarks_<name>"`, `title`, `description` ≤ ~300 chars: what / when vs neighbour / won't do.
   - `inputSchema`: raw zod shape using helpers from `src/tools/coerce.ts` (`CoercedBool`, `CoercedInt`,
     `limitParam`). Enums over free strings.
   - `outputSchema` + return `structuredContent` and a self-sufficient text block.
   - `annotations`: all four hints. Read tools: `readOnlyHint: true`.
   - Write tools additionally: `write: true`, `dryRun: CoercedBool().default(true)`, bounded set,
     snapshot via `deps.snapshots.take()` before applying, roots rejected. Dry run → `toolOk`.
   - `handler(args, deps)`: return `toolOk`/`toolError` from `src/tools/result.ts`; never throw for
     expected conditions; never construct deps inside.
3. **Register** — one import + one array entry in `src/tools/registry.ts`.
4. **Tests** (`packages/mcp-server/test/tools/<name>.handler.test.ts`): SDK-free, literal fake `ToolDeps`
   via `test/helpers/deps.ts`; cover happy path, one coerced input (`"false"`), one error path
   (source unavailable → `isError` with remediation). Update `test/tools/registry.test.ts` snapshot of
   write tools if `write: true`.
5. **Fixture** — if the tool reads the tree, extend `test/fixtures/Bookmarks.sample.json` (synthetic data
   only — public repo).
6. **Client-level** — add one call to `test/mcp/inmemory.test.ts` only if the tool changes wire shape
   (new outputSchema pattern, new annotation).
7. **Docs** — row in `README.md` tools table; new term → `CONTEXT.md` same commit.
8. `pnpm verify` → 0. Commit `feat(tools): bookmarks_<name> (why) `.
