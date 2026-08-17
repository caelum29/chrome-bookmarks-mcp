import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BookmarksFileError,
  createBookmarksFileSource,
  parseBookmarksJson,
} from "../../src/chrome/bookmarks-file.js";
import { unixMsToWebkit, webkitToUnixMs } from "../../src/chrome/webkit-time.js";
import { findNode, treeStats, walk } from "../../src/domain/tree.js";
import { fixtureTree } from "../helpers/deps.js";

describe("WebKit epoch conversion", () => {
  it("round-trips and treats 0/invalid as 0", () => {
    // 13350000000000000 µs since 1601 = 2024-01-… ; only stability matters here
    const ms = webkitToUnixMs("13350000000000000");
    expect(ms).toBeGreaterThan(1_700_000_000_000);
    expect(unixMsToWebkit(ms)).toBe("13350000000000000");
    expect(webkitToUnixMs("0")).toBe(0);
    expect(webkitToUnixMs(undefined)).toBe(0);
    expect(webkitToUnixMs("garbage")).toBe(0);
  });
});

describe("Bookmarks file parsing", () => {
  it("maps Chrome's raw shape to domain nodes with guid, parentId, index and Unix ms", () => {
    const tree = fixtureTree();
    const dev = findNode(tree, "22222222-2222-4222-8222-222222222222");
    expect(dev).toMatchObject({ id: "6", title: "Dev", parentId: "1", index: 1 });
    expect(dev?.url).toBeUndefined();
    expect(dev?.children).toHaveLength(3);
    const node = findNode(tree, "7"); // lookup by local id also works
    expect(node?.url).toBe("https://nodejs.org/docs/");
    expect(node?.dateAdded).toBeGreaterThan(1_700_000_000_000);
    expect(treeStats(tree)).toEqual({ folders: 2, bookmarks: 5, maxDepth: 3 });
    expect([...walk(tree)].length).toBe(10);
  });

  it("tolerates a missing root and rejects malformed input with a typed error", () => {
    const t = parseBookmarksJson(
      JSON.stringify({
        roots: { bookmark_bar: { id: "1", guid: "g", name: "b", type: "folder", children: [] } },
      }),
    );
    expect(t.roots.other.children).toEqual([]);
    expect(() => parseBookmarksJson("{not json")).toThrow(BookmarksFileError);
    expect(() => parseBookmarksJson("{}")).toThrow(/roots/);
  });

  it("file source reports existence and a not_found error with remediation", async () => {
    const dir = mkdtempSync(join(tmpdir(), "bm-"));
    const missing = createBookmarksFileSource(join(dir, "Bookmarks"));
    expect(await missing.exists()).toBe(false);
    await expect(missing.read()).rejects.toMatchObject({ code: "not_found" });
    writeFileSync(join(dir, "Bookmarks"), JSON.stringify({ roots: {} }));
    const present = createBookmarksFileSource(join(dir, "Bookmarks"));
    expect(await present.exists()).toBe(true);
    expect((await present.read()).roots.synced.children).toEqual([]);
  });
});
