# ADR-0001: Node 22 + TS strict + pnpm workspace; MCP SDK v1.x line behind an SDK-free seam
Date: 2026-08-17 · Status: accepted

## Context
Greenfield MCP server + MV3 extension. Two SDK lines exist on npm: `@modelcontextprotocol/sdk` 1.x
(`latest`, stdio-proven, used by Claude Desktop/Code today) and the scoped v2 packages
(`@modelcontextprotocol/server@2.0.0`, spec 2026-07-28: stateless, per-request server factory,
`server/discover`, MRTR elicitation). v2 docs and the conformance suite describe HTTP; stdio support is
unverified. Our only transport for the foreseeable future is stdio to a local client.

## Decision
- Runtime: Node ≥22.5, TypeScript strict + `verbatimModuleSyntax`, pnpm workspace, Vitest, Biome.
- MCP: `@modelcontextprotocol/sdk` **1.x** + zod 4. Pin exact versions.
- **SDK-free seam**: only `packages/mcp-server/src/server.ts` and `run-stdio.ts` import the SDK.
  Tools, domain, adapters and tests never do. `src/tools/types.ts` mirrors the SDK result shape structurally.
- Extension: MV3 service worker bundled by esbuild, no framework.

## Consequences
- v2 migration cost is bounded to `server.ts` + `run-stdio.ts`. Revisit trigger: Claude Desktop or Claude
  Code announces v2/2026-07-28 stdio support, **or** we need Streamable HTTP.
- Do not build on deprecated-in-2026-07-28 primitives (Roots, Sampling, Logging, `ping` as health).
- Handlers stay unit-testable with plain fakes; client-level tests use the SDK's `InMemoryTransport` only in `test/mcp/`.

## What the agent should do
- BEFORE adding an import of `@modelcontextprotocol/*` outside `server.ts`/`run-stdio.ts`: stop — it violates the seam.
- WHEN a tool needs a client capability (elicitation, sampling): use in-band params (`dryRun`, `confirm`) instead.
- VALIDATION: `grep -rl modelcontextprotocol packages/mcp-server/src | sort` prints exactly `server.ts` and `run-stdio.ts`.
