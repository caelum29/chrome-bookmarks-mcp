// bookmarks_tree handler: outline shape, coerced args, agent-actionable errors — SDK-free.
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { BookmarksFileError } from "../../src/chrome/bookmarks-file.js";
import { bookmarksTree } from "../../src/tools/bookmarks_tree.js";
import { deps, fakeFile } from "../helpers/deps.js";

// handlers receive SDK-validated args; mimic that with the tool's own schema
const parse = (raw: Record<string, unknown>) => z.object(bookmarksTree.inputSchema).parse(raw);

describe("bookmarks_tree", () => {
  it("returns the three roots with counts at default depth 2, no URLs in text", async () => {
    const r = await bookmarksTree.handler(parse({}), deps());
    expect(r.isError).toBeUndefined();
    const s = r.structuredContent as {
      stats: { bookmarks: number; folders: number };
      roots: unknown[];
      source: string;
    };
    expect(s.source).toBe("file");
    expect(s.stats).toMatchObject({ bookmarks: 5, folders: 2, maxDepth: 3 });
    expect(s.roots).toHaveLength(3);
    const text = r.content[0]?.text ?? "";
    expect(text).toContain("Dev  [2 bookmarks, 1 folders, 3 total]");
    expect(text).not.toContain("https://");
    expect(text).toContain("BEGIN UNTRUSTED");
  });

  it("coerces string args: depth '0' from a folder guid shows only that folder", async () => {
    const r = await bookmarksTree.handler(
      parse({ folder: "22222222-2222-4222-8222-222222222222", depth: "0" }),
      deps(),
    );
    const s = r.structuredContent as { roots: Array<{ title: string; children?: unknown[] }> };
    expect(s.roots).toHaveLength(1);
    expect(s.roots[0]?.title).toBe("Dev");
    expect(s.roots[0]?.children).toBeUndefined();
  });

  it("clamps an out-of-range depth instead of rejecting", async () => {
    expect(parse({ depth: 99 }).depth).toBe(6);
    expect(parse({ depth: -3 }).depth).toBe(0);
  });

  it("errors with guidance for an unknown folder and for a bookmark guid", async () => {
    const unknown = await bookmarksTree.handler(parse({ folder: "nope" }), deps());
    expect(unknown.isError).toBe(true);
    expect(unknown.content[0]?.text).toContain("without `folder`");
    const leaf = await bookmarksTree.handler(
      parse({ folder: "11111111-1111-4111-8111-111111111111" }),
      deps(),
    );
    expect(leaf.isError).toBe(true);
    expect(leaf.content[0]?.text).toContain("not a folder");
  });

  it("surfaces a missing Bookmarks file as an agent-actionable error, not a throw", async () => {
    const err = new BookmarksFileError("Bookmarks file not found — check profile", "not_found");
    const r = await bookmarksTree.handler(parse({}), deps({ file: fakeFile({ error: err }) }));
    expect(r.isError).toBe(true);
    expect(r.structuredContent).toEqual({ code: "not_found" });
  });
});
