import type { Root, Blockquote, RootContent } from "mdast";
import type { Plugin } from "unified";
import { visit, SKIP } from "unist-util-visit";
import { COMMENT_STATUSES, type CommentStatus } from "../shared/types.ts";

declare module "mdast" {
  interface BlockquoteData {
    commentId?: string;
    commentStatus?: CommentStatus;
  }
}

function parseCalloutHeader(
  text: string,
): { id: string; status: CommentStatus; rest: string } | null {
  if (!text.startsWith("[!comment]")) return null;

  const after = text.slice("[!comment]".length).trimStart();
  const attrs = new Map<string, string>();
  let remaining = after;

  while (remaining.length > 0) {
    const match = remaining.match(/^(\w+)="([^"]*)"\s*/);
    if (!match) break;
    attrs.set(match[1]!, match[2]!);
    remaining = remaining.slice(match[0]!.length);
  }

  const id = attrs.get("id");
  const statusStr = attrs.get("status");
  if (!id || !statusStr) return null;
  if (!(COMMENT_STATUSES as readonly string[]).includes(statusStr)) return null;

  const rest = remaining.replace(/^\n/, "");
  return { id, status: statusStr as CommentStatus, rest };
}

export const remarkComment: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const first = node.children[0];
      if (first?.type !== "paragraph") return SKIP;

      const firstChild = first.children[0];
      if (firstChild?.type !== "text") return SKIP;

      const parsed = parseCalloutHeader(firstChild.value);
      if (!parsed) return SKIP;

      node.data = {
        ...node.data,
        commentId: parsed.id,
        commentStatus: parsed.status,
      };

      if (parsed.rest) {
        firstChild.value = parsed.rest;
      } else if (first.children.length > 1) {
        first.children = first.children.slice(1);
      } else {
        node.children = node.children.slice(1);
      }

      return SKIP;
    });
  };
};

export function isNonContentNode(node: RootContent): boolean {
  return node.type === "yaml" || isCommentNode(node);
}

export function isCommentNode(node: RootContent): node is Blockquote & {
  data: { commentId: string; commentStatus: CommentStatus };
} {
  return (
    node.type === "blockquote" &&
    typeof node.data?.commentId === "string" &&
    typeof node.data?.commentStatus === "string"
  );
}

export function buildCalloutHeader(id: string, status: CommentStatus): string {
  return `[!comment] id="${id}" status="${status}"`;
}

export function serializeCommentNode(
  id: string,
  status: CommentStatus,
  bodyMarkdown: string,
): string {
  const header = buildCalloutHeader(id, status);
  const content = bodyMarkdown ? `${header}\n${bodyMarkdown}` : header;
  return content
    .split("\n")
    .map((l) => (l ? `> ${l}` : ">"))
    .join("\n");
}
