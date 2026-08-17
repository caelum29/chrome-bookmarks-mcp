// Read-only adapter for Chrome's `Bookmarks` JSON file — the fallback source when the bridge is
// down. This module NEVER writes the file (ADR-0002). Converts WebKit time at the boundary.
import { readFile, stat } from "node:fs/promises";
import { z } from "zod";
import { type BookmarkNode, type BookmarkTree, ROOT_KEYS, type RootKey } from "../domain/tree.js";
import { webkitToUnixMs } from "./webkit-time.js";

// Raw node shape as Chrome writes it — only the fields we read. Validated at the boundary because
// the file is written by another program; unknown extra keys are allowed (Chrome adds meta_info etc.).
interface RawNode {
  id: string;
  guid: string;
  name?: string;
  type: "url" | "folder";
  url?: string;
  date_added?: string;
  date_modified?: string;
  children?: RawNode[];
}
const RawNodeSchema: z.ZodType<RawNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    guid: z.string(),
    name: z.string().optional(),
    type: z.enum(["url", "folder"]),
    url: z.string().optional(),
    date_added: z.string().optional(),
    date_modified: z.string().optional(),
    children: z.array(RawNodeSchema).optional(),
  }),
);
const RawFileSchema = z.object({
  version: z.number().optional(),
  roots: z.object({
    bookmark_bar: RawNodeSchema.optional(),
    other: RawNodeSchema.optional(),
    synced: RawNodeSchema.optional(),
  }),
});

/** Abstraction over "where does the tree come from" so tools/tests can inject a fake. */
export interface BookmarksSource {
  /** Whether the file exists and is readable (never throws). */
  exists(): Promise<boolean>;
  /** Parse the current tree. Throws `BookmarksFileError` with an agent-readable message. */
  read(): Promise<BookmarkTree>;
}

export class BookmarksFileError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "unreadable" | "malformed",
  ) {
    super(message);
    this.name = "BookmarksFileError";
  }
}

function toNode(raw: RawNode, parentId: string | undefined, index: number): BookmarkNode {
  const node: BookmarkNode = {
    id: raw.id,
    guid: raw.guid,
    index,
    title: raw.name ?? "",
    dateAdded: webkitToUnixMs(raw.date_added),
  };
  if (parentId !== undefined) node.parentId = parentId;
  if (raw.type === "url") node.url = raw.url ?? "";
  else node.children = (raw.children ?? []).map((c, i) => toNode(c, raw.id, i));
  const mod = webkitToUnixMs(raw.date_modified);
  if (mod) node.dateModified = mod;
  return node;
}

/** Parse the JSON text of a `Bookmarks` file into the domain tree. Exported for fixture tests. */
export function parseBookmarksJson(text: string): BookmarkTree {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BookmarksFileError("Bookmarks file is not valid JSON", "malformed");
  }
  const parsed = RawFileSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new BookmarksFileError(
      `Bookmarks file has an unexpected shape at ${first?.path.join(".") || "root"}: ${first?.message ?? "invalid"}`,
      "malformed",
    );
  }
  const raw = parsed.data;
  const roots = {} as Record<RootKey, BookmarkNode>;
  for (const key of ROOT_KEYS) {
    const r = raw.roots[key];
    // Chrome always writes all three; tolerate a missing one with an empty folder
    roots[key] = r
      ? toNode(r, undefined, 0)
      : { id: key, guid: key, index: 0, title: key, dateAdded: 0, children: [] };
  }
  return { roots };
}

/** File-backed source for the configured profile. */
export function createBookmarksFileSource(path: string): BookmarksSource {
  return {
    async exists() {
      try {
        return (await stat(path)).isFile();
      } catch {
        return false;
      }
    },
    async read() {
      let text: string;
      try {
        text = await readFile(path, "utf8");
      } catch (e) {
        const code = (e as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
          throw new BookmarksFileError(
            "Bookmarks file not found for this browser/profile — check BOOKMARKS_BROWSER / BOOKMARKS_PROFILE, or load the extension for live access",
            "not_found",
          );
        }
        throw new BookmarksFileError(
          `Bookmarks file could not be read (${code ?? "unknown"})`,
          "unreadable",
        );
      }
      return parseBookmarksJson(text);
    },
  };
}
