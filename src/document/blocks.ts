import type { Root, RootContent, List, ListItem, Blockquote } from "mdast";
import { isCommentNode, type CommentNode } from "./remark-comment.ts";

// Where a block lives in the tree, so a comment can be attached to it: a top-level
// node hangs the callout as its next sibling, a list item nests it as a child.
type BlockLocation =
  | { kind: "top"; container: RootContent[]; pos: number; node: RootContent }
  | { kind: "item"; list: List; item: ListItem; itemIndex: number };

export interface BlockEntry {
  location: BlockLocation;
}

export interface CommentEntry {
  node: CommentNode;
  // Index into the `blocks` array of the block this comment annotates; null when
  // the comment precedes every block.
  blockIndex: number | null;
  // Removes this comment node from wherever it lives, keeping that structural
  // knowledge inside `analyze` rather than spread across callers.
  detach: () => void;
}

// The single source of truth for block ordering: every renderer and mutation
// derives positions from here, so what the UI numbers and where a comment lands
// can never drift. A block's index is its position in the returned `blocks`
// array. List items are first-class blocks; the list itself is not.
export function analyze(tree: Root): {
  blocks: BlockEntry[];
  comments: CommentEntry[];
} {
  const blocks: BlockEntry[] = [];
  const comments: CommentEntry[] = [];
  let lastBlockIndex: number | null = null;
  const children = tree.children;

  for (let pos = 0; pos < children.length; pos++) {
    const node = children[pos]!;
    if (node.type === "yaml") continue;
    if (isCommentNode(node)) {
      comments.push({
        node,
        blockIndex: lastBlockIndex,
        detach: () => spliceOut(children, node),
      });
      continue;
    }
    if (node.type === "list") {
      for (let i = 0; i < node.children.length; i++) {
        const item = node.children[i]!;
        blocks.push({
          location: { kind: "item", list: node, item, itemIndex: i },
        });
        lastBlockIndex = blocks.length - 1;
        for (const child of item.children) {
          if (isCommentNode(child)) {
            comments.push({
              node: child,
              blockIndex: lastBlockIndex,
              detach: () => spliceOut(item.children, child),
            });
          }
        }
      }
      continue;
    }
    blocks.push({ location: { kind: "top", container: children, pos, node } });
    lastBlockIndex = blocks.length - 1;
  }

  return { blocks, comments };
}

function spliceOut<T>(arr: T[], node: T): void {
  const i = arr.indexOf(node);
  if (i !== -1) arr.splice(i, 1);
}

// A list item's renderable children, with its comment callouts removed. Keeps
// the "what counts as content vs. comment" rule in one place.
export function itemContent(item: ListItem): ListItem["children"] {
  return item.children.filter((c) => !isCommentNode(c));
}

// The node to render for a block, with its comment callouts removed. A list item
// is wrapped back into a one-item list so its bullet (and ordinal, for ordered
// lists) survives even though only this item is shown.
export function blockContentNode(entry: BlockEntry): RootContent {
  const loc = entry.location;
  if (loc.kind === "top") return loc.node;

  const content = itemContent(loc.item);
  const start = loc.list.ordered ? (loc.list.start ?? 1) + loc.itemIndex : null;
  return {
    type: "list",
    ordered: loc.list.ordered,
    start,
    spread: false,
    children: [{ ...loc.item, children: content }],
  } as List;
}

// True when the block already carries a comment, so a second one is rejected.
export function blockHasComment(entry: BlockEntry): boolean {
  const loc = entry.location;
  if (loc.kind === "item") return loc.item.children.some(isCommentNode);
  const next = loc.container[loc.pos + 1];
  return next !== undefined && isCommentNode(next);
}

// Attach a comment callout to a block: nested in the list item, or as the next
// sibling of a top-level node.
export function attachComment(entry: BlockEntry, callout: Blockquote): void {
  const loc = entry.location;
  if (loc.kind === "item") {
    loc.item.children.push(callout);
  } else {
    loc.container.splice(loc.pos + 1, 0, callout);
  }
}
