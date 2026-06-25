import { toHast } from "mdast-util-to-hast";
import { toHtml } from "hast-util-to-html";
import { toString } from "mdast-util-to-string";
import type { Root, RootContent, List, ListItem } from "mdast";
import type { Element, Root as HastRoot } from "hast";
import { analyze, blockContentNode, itemContent } from "./blocks.ts";
import type {
  DocumentData,
  BlockData,
  CommentData,
  ListItemRef,
} from "../shared/types.ts";
import { parser, stringifier } from "./parser.ts";

function nodeToHtml(node: RootContent): string {
  const hast = toHast({ type: "root", children: [node] } as Root);
  return hast ? toHtml(hast) : "";
}

function childrenToHtml(children: RootContent[]): string {
  const hast = toHast({ type: "root", children } as Root);
  return hast ? toHtml(hast) : "";
}

function childrenToMarkdown(children: RootContent[]): string {
  return stringifier.stringify({ type: "root", children }).trim();
}

// Inner html of each <li> in document order. The whole list is converted once so
// tight/loose stays faithful, then each item's content is pulled back out — the
// <ol>/<ul> itself is rebuilt as a real element by the UI, not from this html.
function listItemHtml(listNode: List): string[] {
  const root = toHast({ type: "root", children: [listNode] } as Root) as
    | HastRoot
    | undefined;
  const ol = root?.children.find((c): c is Element => c.type === "element");
  if (!ol) return [];
  return ol.children
    .filter((c): c is Element => c.type === "element")
    .map((li) => toHtml({ type: "root", children: li.children } as HastRoot));
}

function documentTitle(tree: Root, fallback: string): string {
  for (const node of tree.children) {
    if (node.type === "heading" && node.depth === 1) {
      const text = toString(node).trim();
      if (text) return text;
    }
  }
  return fallback;
}

export function getDocumentData(
  filePath: string,
  markdown: string,
): DocumentData {
  const tree = parser.runSync(parser.parse(markdown)) as Root;
  const { blocks: entries, comments: commentEntries } = analyze(tree);

  const blocks: BlockData[] = [];
  let i = 0;
  while (i < entries.length) {
    const loc = entries[i]!.location;

    // Merge the run of items belonging to one list into a single list block; an
    // item's anchor index is its position in `entries`, unchanged by grouping.
    if (loc.kind === "item") {
      const list = loc.list;
      const items: ListItem[] = [];
      const refs: Omit<ListItemRef, "html">[] = [];
      while (i < entries.length) {
        const next = entries[i]!.location;
        if (next.kind !== "item" || next.list !== list) break;
        const content = itemContent(next.item);
        items.push({
          ...next.item,
          children: content,
          data: { ...next.item.data, hProperties: { "data-block-index": i } },
        });
        refs.push({
          index: i,
          cite: toString({ ...next.item, children: content }),
        });
        i++;
      }
      const listNode: List = {
        type: "list",
        ordered: list.ordered,
        start: list.start ?? null,
        spread: list.spread,
        children: items,
      };
      const html = listItemHtml(listNode);
      const start = list.ordered ? (list.start ?? 1) : 1;
      blocks.push({
        kind: "list",
        ordered: !!list.ordered,
        start: start !== 1 ? start : null,
        items: refs.map((r, k) => ({ ...r, html: html[k] ?? "" })),
      });
      continue;
    }

    const node = blockContentNode(entries[i]!);
    const heading =
      node.type === "heading"
        ? { depth: node.depth, text: toString(node) }
        : null;
    blocks.push({ kind: "node", index: i, html: nodeToHtml(node), heading });
    i++;
  }

  const comments: CommentData[] = commentEntries.map((c) => {
    const children = [...c.node.children] as RootContent[];
    return {
      id: c.node.data.commentId,
      blockIndex: c.blockIndex,
      status: c.node.data.commentStatus,
      body: childrenToMarkdown(children),
      bodyHtml: childrenToHtml(children),
    };
  });

  return { title: documentTitle(tree, filePath), blocks, comments };
}
