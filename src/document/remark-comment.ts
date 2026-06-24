import type { Root, Blockquote, RootContent } from "mdast";
import type { Plugin } from "unified";
import { visit, SKIP } from "unist-util-visit";
import { defaultHandlers, type Handle } from "mdast-util-to-markdown";
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

export type CommentNode = Blockquote & {
  data: { commentId: string; commentStatus: CommentStatus };
};

export function isCommentNode(node: RootContent): node is CommentNode {
  return (
    node.type === "blockquote" &&
    typeof node.data?.commentId === "string" &&
    typeof node.data?.commentStatus === "string"
  );
}

export function buildCalloutHeader(id: string, status: CommentStatus): string {
  return `[!comment] id="${id}" status="${status}"`;
}

// remark-stringify handler that emits comment callouts as `> [!comment] ...`,
// re-attaching the header that remarkComment stripped into `node.data`. Regular
// blockquotes fall back to the default. Serializing the whole tree through this
// handler keeps comments correct wherever they sit — including nested inside a
// list item, where `state` supplies the list's indentation.
export const commentBlockquoteHandler: Handle = (node, parent, state, info) => {
  if (!isCommentNode(node)) {
    return defaultHandlers.blockquote(node, parent, state, info);
  }
  const exit = state.enter("blockquote");
  const tracker = state.createTracker(info);
  tracker.move("> ");
  tracker.shift(2);
  const header = buildCalloutHeader(
    node.data.commentId,
    node.data.commentStatus,
  );
  const body = state.containerFlow(node, tracker.current());
  const content = body ? `${header}\n${body}` : header;
  const value = state.indentLines(content, (line, _, blank) =>
    blank ? ">" : `> ${line}`,
  );
  exit();
  return value;
};
