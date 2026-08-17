// bookmarks_tree — folder outline with counts, depth-limited. Reads the Bookmarks file (bridge
// read path lands in a later slice). Answers "how are my bookmarks organised?" without dumping URLs.
import { z } from "zod";
import { BookmarksFileError } from "../chrome/bookmarks-file.js";
import {
  type FolderOutline,
  findNode,
  folderOutline,
  isFolder,
  ROOT_KEYS,
  treeStats,
} from "../domain/tree.js";
import { limitParam, NonEmptyString } from "./coerce.js";
import { defineTool } from "./define.js";
import { fence, toolError, toolOk } from "./result.js";

const MAX_DEPTH = 6;

// Typed one level deep for the wire (recursive $ref schemas trip some clients); nested children
// keep the same shape at runtime.
const OutlineSchema = z.object({
  guid: z.string(),
  id: z.string(),
  title: z.string(),
  depth: z.number(),
  bookmarkCount: z.number(),
  folderCount: z.number(),
  totalBookmarks: z.number(),
  children: z.array(z.unknown()).optional(),
});

function renderOutline(o: FolderOutline, indent = ""): string[] {
  const label = o.title === "" ? "(untitled)" : o.title;
  const line = `${indent}${label}  [${o.bookmarkCount} bookmarks, ${o.folderCount} folders, ${o.totalBookmarks} total]  guid=${o.guid}`;
  const rest = (o.children ?? []).flatMap((c) => renderOutline(c, `${indent}  `));
  return [line, ...rest];
}

export const bookmarksTree = defineTool({
  name: "bookmarks_tree",
  title: "Bookmarks: folder tree",
  description:
    "Folder outline of the bookmark tree with per-folder counts (no URLs), from the three roots or from a given folder guid, down to `depth`. Use to understand structure before planning a reorganisation. Does not list URLs.",
  inputSchema: {
    folder: NonEmptyString()
      .optional()
      .describe("guid (preferred) or id of the folder to start from; default: all roots"),
    depth: limitParam(MAX_DEPTH, 2, 0).describe(
      `sub-folder levels to include, 0..${MAX_DEPTH}, default 2`,
    ),
  },
  outputSchema: {
    source: z.enum(["file", "bridge"]),
    stats: z.object({ folders: z.number(), bookmarks: z.number(), maxDepth: z.number() }),
    roots: z.array(OutlineSchema),
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  async handler(args, deps) {
    let tree: Awaited<ReturnType<typeof deps.file.read>>;
    try {
      tree = await deps.file.read();
    } catch (e) {
      if (e instanceof BookmarksFileError) return toolError(e.message, { code: e.code });
      return toolError("could not read bookmarks — run bookmarks_status to diagnose");
    }

    let outlines: FolderOutline[];
    if (args.folder) {
      const node = findNode(tree, args.folder);
      if (!node)
        return toolError(
          `no folder with guid/id "${args.folder}" — call bookmarks_tree without \`folder\` to list guids`,
        );
      if (!isFolder(node))
        return toolError(
          `"${args.folder}" is a bookmark, not a folder — pass its parent folder's guid`,
        );
      outlines = [folderOutline(node, args.depth)];
    } else {
      outlines = ROOT_KEYS.map((k) => folderOutline(tree.roots[k], args.depth));
    }

    const stats = treeStats(tree);
    const body = outlines.flatMap((o) => renderOutline(o)).join("\n");
    const text = [
      `source: Bookmarks file (read-only) · ${stats.bookmarks} bookmarks in ${stats.folders} folders, max depth ${stats.maxDepth}`,
      fence("bookmark folder titles", body),
    ].join("\n");
    return toolOk(text, { source: "file", stats, roots: outlines });
  },
});
