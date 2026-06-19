import { toHast } from "mdast-util-to-hast";
import { toHtml } from "hast-util-to-html";
import { toString } from "mdast-util-to-string";
import type { Root, RootContent } from "mdast";
import { isCommentNode, isNonContentNode } from "./remark-comment.ts";
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
  const tree: Root = { type: "root", children };
  return stringifier.stringify(tree).trim();
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

  const blocks: BlockData[] = [];
  const comments: CommentData[] = [];
  let index = 0;

  for (const node of tree.children) {
    if (isNonContentNode(node)) {
      if (isCommentNode(node)) {
        const children = node.children as RootContent[];
        comments.push({
          id: node.data.commentId,
          blockIndex: index === 0 ? null : index - 1,
          status: node.data.commentStatus,
          body: childrenToMarkdown(children),
          bodyHtml: childrenToHtml(children),
        });
      }
      continue;
    }
    const heading =
      node.type === "heading"
        ? { depth: node.depth, text: toString(node) }
        : null;
    blocks.push({ index, html: nodeToHtml(node), heading });
    index++;
  }

  return { title: documentTitle(tree, filePath), blocks, comments };
}
