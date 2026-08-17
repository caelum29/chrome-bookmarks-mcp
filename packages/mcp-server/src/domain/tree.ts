// Pure bookmark-tree model and queries. No I/O, no SDK, no Chrome types — see CONTEXT.md §1.
export type RootKey = "bookmark_bar" | "other" | "synced";

/** A folder or a URL bookmark. Timestamps are Unix ms (converted at the adapter boundary). */
export interface BookmarkNode {
  id: string;
  guid: string;
  parentId?: string;
  index: number;
  title: string;
  /** Present on bookmarks, absent on folders. */
  url?: string;
  dateAdded: number;
  dateModified?: number;
  children?: BookmarkNode[];
}

/** The whole tree: the three fixed roots. */
export interface BookmarkTree {
  roots: Record<RootKey, BookmarkNode>;
}

export const ROOT_KEYS: readonly RootKey[] = ["bookmark_bar", "other", "synced"];

export function isFolder(n: BookmarkNode): boolean {
  return n.url === undefined;
}

/** Depth-first walk over every node in the tree. */
export function* walk(tree: BookmarkTree): Generator<BookmarkNode> {
  const stack: BookmarkNode[] = ROOT_KEYS.map((k) => tree.roots[k]);
  while (stack.length) {
    const n = stack.pop() as BookmarkNode;
    yield n;
    if (n.children)
      for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i] as BookmarkNode);
  }
}

/** Counts used by status/summary answers. */
export interface TreeStats {
  folders: number;
  bookmarks: number;
  maxDepth: number;
}

export function treeStats(tree: BookmarkTree): TreeStats {
  let folders = 0;
  let bookmarks = 0;
  let maxDepth = 0;
  const visit = (n: BookmarkNode, depth: number) => {
    if (depth > maxDepth) maxDepth = depth;
    if (isFolder(n)) {
      folders++;
      for (const c of n.children ?? []) visit(c, depth + 1);
    } else bookmarks++;
  };
  for (const k of ROOT_KEYS) visit(tree.roots[k], 0);
  // the three roots are containers, not user folders
  return { folders: Math.max(0, folders - ROOT_KEYS.length), bookmarks, maxDepth };
}

/** Compact folder outline: what an agent needs to reason about structure without every URL. */
export interface FolderOutline {
  guid: string;
  id: string;
  title: string;
  depth: number;
  /** Direct URL bookmarks in this folder. */
  bookmarkCount: number;
  /** Direct sub-folders. */
  folderCount: number;
  /** All bookmarks in this subtree. */
  totalBookmarks: number;
  children?: FolderOutline[];
}

function subtreeBookmarks(n: BookmarkNode): number {
  if (!isFolder(n)) return 1;
  let t = 0;
  for (const c of n.children ?? []) t += subtreeBookmarks(c);
  return t;
}

/** Build the folder outline down to `maxDepth` (roots are depth 0). */
export function folderOutline(node: BookmarkNode, maxDepth: number, depth = 0): FolderOutline {
  const kids = node.children ?? [];
  const out: FolderOutline = {
    guid: node.guid,
    id: node.id,
    title: node.title,
    depth,
    bookmarkCount: kids.filter((c) => !isFolder(c)).length,
    folderCount: kids.filter(isFolder).length,
    totalBookmarks: subtreeBookmarks(node),
  };
  if (depth < maxDepth) {
    const sub = kids.filter(isFolder).map((c) => folderOutline(c, maxDepth, depth + 1));
    if (sub.length) out.children = sub;
  }
  return out;
}

/** Find a node by guid or id (guid preferred — id is machine-local). */
export function findNode(tree: BookmarkTree, ref: string): BookmarkNode | undefined {
  for (const n of walk(tree)) if (n.guid === ref || n.id === ref) return n;
  return undefined;
}
