import type { Root, RootContent, Blockquote } from "mdast";
import type { Comment, CommentStatus } from "../shared/types.ts";
import {
  analyze,
  blockContentNode,
  blockHasComment,
  attachComment,
} from "./blocks.ts";
import { parser, stringifier } from "./parser.ts";

function parse(markdown: string): Root {
  return parser.runSync(parser.parse(markdown));
}

function nodeToMarkdown(node: RootContent): string {
  return stringifier.stringify({ type: "root", children: [node] }).trim();
}

function childrenToMarkdown(children: RootContent[]): string {
  return stringifier.stringify({ type: "root", children }).trim();
}

function parseBodyChildren(body: string): Blockquote["children"] {
  if (!body) return [];
  return parse(body).children as Blockquote["children"];
}

// One whole-tree pass: comment callouts (top-level or nested in a list item) are
// emitted by the stringifier's blockquote handler, and adjacent content keeps the
// spacing and list markers the serializer chooses with full sibling context.
function stringify(tree: Root): string {
  return stringifier.stringify(tree).trimEnd() + "\n";
}

export function normalizeMarkdown(input: string): string {
  return stringifier.stringify(parser.parse(input.trim())).trim();
}

export function extractComments(markdown: string): Comment[] {
  const tree = parse(markdown);
  const { blocks, comments } = analyze(tree);
  const cites = blocks.map((b) => nodeToMarkdown(blockContentNode(b)));

  return comments.map((c) => ({
    id: c.node.data.commentId,
    status: c.node.data.commentStatus,
    body: childrenToMarkdown([...c.node.children]),
    paragraphText: c.blockIndex === null ? "" : (cites[c.blockIndex] ?? ""),
  }));
}

export function insertComment(
  markdown: string,
  blockIndex: number,
  id: string,
  status: CommentStatus,
  body: string,
): string {
  const tree = parse(markdown);
  const entry = analyze(tree).blocks[blockIndex];

  if (!entry) {
    throw new Error(`Block index ${blockIndex} out of range`);
  }
  if (blockHasComment(entry)) {
    throw new Error(`Block ${blockIndex} already has a comment`);
  }

  attachComment(entry, {
    type: "blockquote",
    data: { commentId: id, commentStatus: status },
    children: parseBodyChildren(body),
  });

  return stringify(tree);
}

export function updateCommentStatus(
  markdown: string,
  ids: string[],
  newStatus: CommentStatus,
): string {
  const tree = parse(markdown);
  const idSet = new Set(ids);

  for (const { node } of analyze(tree).comments) {
    if (idSet.has(node.data.commentId)) {
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

  for (const { node } of analyze(tree).comments) {
    if (node.data.commentId === id) {
      node.children = parseBodyChildren(newBody);
      break;
    }
  }

  return stringify(tree);
}

export function removeComment(markdown: string, id: string): string {
  const tree = parse(markdown);

  for (const c of analyze(tree).comments) {
    if (c.node.data.commentId === id) c.detach();
  }

  return stringify(tree);
}

export interface FormatOptions {
  excludeNotes?: boolean;
  maxCiteLength?: number;
}

export function formatCommentsForStdout(
  comments: Comment[],
  options: FormatOptions = {},
): string {
  const { excludeNotes = false, maxCiteLength = 120 } = options;

  const actionable = comments.filter((c) => {
    if (c.status === "requested") return true;
    if (c.status === "note" && !excludeNotes) return true;
    return false;
  });
  if (actionable.length === 0) return "";

  return actionable
    .map((c) => {
      let cite = c.paragraphText;
      const lines = cite.split("\n");
      if (cite.length > maxCiteLength && lines.length > 2) {
        cite = `${lines[0]}\n...\n${lines[lines.length - 1]}`;
      }
      const citeParts = ["<cite>"];
      if (cite) citeParts.push(cite);
      citeParts.push("</cite>");

      const tag = c.status === "note" ? "note" : "comment";
      const bodyParts = [`<${tag} id="${c.id}">`];
      if (c.body) bodyParts.push(c.body);
      bodyParts.push(`</${tag}>`);

      return [...citeParts, "", ...bodyParts].join("\n");
    })
    .join("\n\n");
}
