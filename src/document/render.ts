import { toHast } from "mdast-util-to-hast";
import { toHtml } from "hast-util-to-html";
import { toString } from "mdast-util-to-string";
import type { Root, RootContent } from "mdast";
import { analyze, blockContentNode } from "./blocks.ts";
import type { DocumentData, BlockData, CommentData } from "../shared/types.ts";
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
  const { blocks: blockEntries, comments: commentEntries } = analyze(tree);

  const blocks: BlockData[] = blockEntries.map((entry, index) => {
    const node = blockContentNode(entry);
    const heading =
      node.type === "heading"
        ? { depth: node.depth, text: toString(node) }
        : null;
    return { index, html: nodeToHtml(node), heading };
  });

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
