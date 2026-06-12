import type { Root, RootContent, Blockquote } from "mdast";
import type { Comment, CommentStatus } from "./types.ts";
import { isCommentNode, serializeCommentNode } from "./remark-comment.ts";
import { parser, stringifier } from "./parser.ts";

function parse(markdown: string): Root {
  return parser.runSync(parser.parse(markdown));
}

function stringifyChildren(node: Blockquote): string {
  const bodyTree: Root = { type: "root", children: [...node.children] };
  return stringifier.stringify(bodyTree).trim();
}

function parseBodyChildren(body: string): Blockquote["children"] {
  if (!body) return [];
  return parse(body).children as Blockquote["children"];
}

function stringify(tree: Root): string {
  const out: string[] = [];
  for (const node of tree.children) {
    if (isCommentNode(node)) {
      out.push(
        serializeCommentNode(
          node.data.commentId,
          node.data.commentStatus,
          stringifyChildren(node),
        ),
      );
    } else {
      const wrapper: Root = { type: "root", children: [node] };
      out.push(stringifier.stringify(wrapper).trimEnd());
    }
  }
  return out.join("\n\n") + "\n";
}

function getNodeText(node: RootContent): string {
  const tree: Root = { type: "root", children: [node] };
  return stringifier.stringify(tree).trim();
}

export function normalizeMarkdown(input: string): string {
  return stringifier.stringify(parser.parse(input.trim())).trim();
}

export function extractComments(markdown: string): Comment[] {
  const tree = parse(markdown);
  const comments: Comment[] = [];

  for (let i = 0; i < tree.children.length; i++) {
    const node = tree.children[i]!;
    if (!isCommentNode(node)) continue;

    let paragraphText = "";
    for (let j = i - 1; j >= 0; j--) {
      const prev = tree.children[j]!;
      if (isCommentNode(prev)) continue;
      paragraphText = getNodeText(prev);
      break;
    }

    const bodyTree: Root = { type: "root", children: [...node.children] };
    const body = stringifier.stringify(bodyTree).trim();

    comments.push({
      id: node.data.commentId,
      status: node.data.commentStatus,
      body,
      paragraphText,
    });
  }

  return comments;
}

export function insertComment(
  markdown: string,
  blockIndex: number,
  id: string,
  status: CommentStatus,
  body: string,
): string {
  const tree = parse(markdown);

  let count = 0;
  let insertAfter = -1;

  for (let i = 0; i < tree.children.length; i++) {
    const node = tree.children[i]!;
    if (isCommentNode(node)) continue;

    if (count === blockIndex) {
      insertAfter = i;
      if (
        insertAfter + 1 < tree.children.length &&
        isCommentNode(tree.children[insertAfter + 1]!)
      ) {
        throw new Error(`Block ${blockIndex} already has a comment`);
      }
      break;
    }
    count++;
  }

  if (insertAfter === -1) {
    throw new Error(`Block index ${blockIndex} out of range`);
  }

  const calloutNode: Blockquote = {
    type: "blockquote",
    data: { commentId: id, commentStatus: status },
    children: parseBodyChildren(body),
  };

  tree.children.splice(insertAfter + 1, 0, calloutNode);

  return stringify(tree);
}

export function updateCommentStatus(
  markdown: string,
  ids: string[],
  newStatus: CommentStatus,
): string {
  const tree = parse(markdown);
  const idSet = new Set(ids);

  for (const node of tree.children) {
    if (isCommentNode(node) && idSet.has(node.data.commentId)) {
      node.data.commentStatus = newStatus;
    }
  }

  return stringify(tree);
}

export function editCommentBody(
  markdown: string,
  id: string,
  newBody: string,
): string {
  const tree = parse(markdown);

  for (const node of tree.children) {
    if (isCommentNode(node) && node.data.commentId === id) {
      node.children = parseBodyChildren(newBody);
      break;
    }
  }

  return stringify(tree);
}

export function removeComment(markdown: string, id: string): string {
  const tree = parse(markdown);

  tree.children = tree.children.filter((node) => {
    return !isCommentNode(node) || node.data.commentId !== id;
  });

  return stringify(tree);
}

export function formatCommentsForStdout(
  comments: Comment[],
  maxCiteLength = 120,
): string {
  const actionable = comments.filter((c) => c.status === "requested");
  if (actionable.length === 0) return "";

  return actionable
    .map((c) => {
      let cite = c.paragraphText;
      if (cite.length > maxCiteLength) {
        const half = Math.floor((maxCiteLength - 3) / 2);
        cite = `${cite.slice(0, half)}...${cite.slice(-half)}`;
      }
      return `<cite>${cite}</cite>\n<comment id="${c.id}">${c.body}</comment>`;
    })
    .join("\n\n");
}
