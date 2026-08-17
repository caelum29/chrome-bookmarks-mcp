// Meta-test over the tool surface: namespace, uniqueness, annotations, description budget, and the
// write-classification invariant. The write-tool snapshot fails loudly when someone adds an
// ungated mutation (ADR-0002/0003).
import { describe, expect, it } from "vitest";
import {
  allTools,
  assertRegistryShape,
  assertWriteClassification,
  MAX_TOOLS,
} from "../../src/tools/registry.js";
import type { AnyToolDescriptor } from "../../src/tools/types.js";

const stub = (over: Partial<AnyToolDescriptor>): AnyToolDescriptor => ({
  name: "bookmarks_stub",
  title: "stub",
  description: "stub",
  inputSchema: {},
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async () => ({ content: [] }),
  ...over,
});

describe("tool registry", () => {
  it("every tool is namespaced, unique, annotated, and within the surface ceiling", () => {
    expect(() => assertRegistryShape()).not.toThrow();
    expect(allTools.length).toBeLessThanOrEqual(MAX_TOOLS);
    for (const t of allTools) {
      expect(t.name).toMatch(/^bookmarks_[a-z_]+$/);
      expect(Object.keys(t.annotations).sort()).toEqual([
        "destructiveHint",
        "idempotentHint",
        "openWorldHint",
        "readOnlyHint",
      ]);
      expect(t.description.length, `${t.name} description too long`).toBeLessThanOrEqual(400);
      expect(t.outputSchema, `${t.name} must declare outputSchema`).toBeDefined();
    }
  });

  it("snapshots the exact set of write tools (update deliberately when adding one)", () => {
    const writes = allTools
      .filter((t) => t.write)
      .map((t) => t.name)
      .sort();
    const local = allTools
      .filter((t) => t.localWrite)
      .map((t) => t.name)
      .sort();
    expect(writes).toEqual([]);
    expect(local).toEqual([]);
  });

  it("boot invariant refuses a non-read-only tool without write classification", () => {
    const rogue = stub({
      name: "bookmarks_rogue",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    });
    expect(() => assertWriteClassification([rogue])).toThrow(/bookmarks_rogue/);
    expect(() => assertWriteClassification([{ ...rogue, write: true }])).not.toThrow();
    expect(() => assertWriteClassification([{ ...rogue, localWrite: true }])).not.toThrow();
  });

  it("boot invariant refuses a read-only tool that claims to write", () => {
    expect(() => assertWriteClassification([stub({ write: true })])).toThrow(/readOnlyHint=true/);
  });

  it("registry shape refuses duplicates, foreign namespaces and oversize surfaces", () => {
    expect(() => assertRegistryShape([stub({}), stub({})])).toThrow(/duplicate/);
    expect(() =>
      assertRegistryShape([stub({ name: "calibre_x" as `bookmarks_${string}` })]),
    ).toThrow(/namespace/);
    const many = Array.from({ length: MAX_TOOLS + 1 }, (_, i) => stub({ name: `bookmarks_t${i}` }));
    expect(() => assertRegistryShape(many)).toThrow(/ceiling/);
  });
});
