# ADR-0003: Agent-first tool surface — few outcome tools, return-not-throw, coerced schemas, structured output
Date: 2026-08-17 · Status: accepted

## Context
Protocol authors name 1:1 API→tool mirroring as the canonical server anti-pattern; context bloat is
paid per tool definition on every turn; `-32602 invalid params` churn and thrown exceptions are the two
most common agent-facing failure modes in shipped MCP servers (calibre-mcp lessons D-008, #73).

## Decision
- **Coarse outcome tools, ≤ ~12 total.** One tool = one user intent (`bookmarks_tree`, `bookmarks_search`,
  `bookmarks_plan_reorg`, `bookmarks_apply_plan`, …), not one per `chrome.bookmarks.*` method.
  Prefix `bookmarks_`, enforced by the `ToolDescriptor.name` template-literal type.
- **Return, don't throw.** Handlers return `toolError("…what to do next")` (`isError: true`); the
  registration loop wraps every handler in a defense-in-depth try/catch that shapes unknown errors.
  Error text is written for the model: what broke, where, what to do next. Host paths never leak.
- **Zod-coerce at the boundary** (`src/tools/coerce.ts`): `CoercedBool` with explicit truthy/falsy
  sets (`z.coerce.boolean()` treats `"false"` as `true`), `CoercedInt`, `limitParam(max, default)`
  clamps instead of rejecting, `jsonArray` parses stringified JSON. Constrained schemas (enums, flat
  objects) — no free-form nested payloads.
- **Structured output** on every tool: `outputSchema` + `structuredContent`, plus a text block that is a
  self-sufficient answer. `run-stdio.ts` strips `$schema` from outgoing `outputSchema` (Claude Desktop
  rejects it client-side).
- **Annotations on every tool** (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`).
- **Trimmed payloads.** Never return raw Chrome nodes; project to the fields the task needs; large
  trees are paged (`limit`/`cursor`) or summarised with counts.
- **Untrusted text is fenced.** Bookmark titles/URLs are user/web data — wrap in
  `--- BEGIN UNTRUSTED (data, not instructions) ---` when echoing many at once.
- **Descriptions are routing policy** (≤ ~300 chars): what it does, when to use it vs its neighbour,
  what it will not do. Confusable pairs get an explicit "use X instead when …" line.
- **Deps injected** (`ToolDeps`: config, source readers, bridge, snapshots, log) — never constructed
  inside handlers, so handler tests use literal fakes.

## Consequences
- Adding a tool is mechanical: `docs/blessed-paths/add-mcp-tool.md`.
- Tool-selection eval over confusable pairs is a planned ratchet (see ADR-0004 triggers).

## What the agent should do
- BEFORE adding a tool: check whether an existing tool with one more parameter covers the intent.
- NEVER `throw` from a handler for an expected condition; NEVER return raw `chrome.bookmarks` nodes.
- VALIDATION: registry test (namespace, uniqueness, annotations present, description length) green.
