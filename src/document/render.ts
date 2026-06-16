import { resolve } from "node:path";
import { toHast } from "mdast-util-to-hast";
import { toHtml } from "hast-util-to-html";
import { toString } from "mdast-util-to-string";
import type { Root, RootContent } from "mdast";
import { isCommentNode } from "./remark-comment.ts";
import type {
  CommentStatus,
  DocumentData,
  BlockData,
  CommentData,
} from "../shared/types.ts";
import { parser, stringifier } from "./parser.ts";

const uiDir = resolve(import.meta.dir, "../ui");
const pageTemplate = await Bun.file(resolve(uiDir, "page.html")).text();
const styleSheet = await Bun.file(resolve(uiDir, "style.css")).text();
const clientScript = await Bun.file(resolve(uiDir, "client.js")).text();

function nodeToHtml(node: RootContent): string {
  const hast = toHast({ type: "root", children: [node] } as Root);
  return hast ? toHtml(hast) : "";
}

function childrenToHtml(children: RootContent[]): string {
  const hast = toHast({ type: "root", children } as Root);
  return hast ? toHtml(hast) : "";
}

const esc = Bun.escapeHTML;

const STATUS_LABELS: Record<CommentStatus, string> = {
  requested: "Change Requested",
  note: "Note",
  resolved: "Resolved",
};

function childrenToMarkdown(children: RootContent[]): string {
  const tree: Root = { type: "root", children };
  return stringifier.stringify(tree).trim();
}

function renderCommentHtml(
  id: string,
  status: CommentStatus,
  children: RootContent[],
): string {
  const bodyHtml = childrenToHtml(children);
  const bodyMd = esc(childrenToMarkdown(children));
  const collapsed = status === "resolved" ? " collapsed" : "";
  const opt = (v: CommentStatus) => {
    const sel = v === status ? " selected" : "";
    return `<option value="${v}"${sel}>${v}</option>`;
  };

  return `<div class="comment ${status}${collapsed}" data-id="${esc(id)}">
  <div class="comment-header">
    <span class="comment-badge ${status}">${STATUS_LABELS[status]}</span>
    <div class="comment-actions">
      <select class="status-select" data-id="${esc(id)}">${opt("requested")}${opt("note")}${opt("resolved")}</select>
      <button class="btn-icon btn-edit" data-id="${esc(id)}" title="编辑">&#9998;</button>
      <button class="btn-icon btn-delete" data-id="${esc(id)}" title="删除">&times;</button>
    </div>
  </div>
  <div class="comment-body" data-body="${bodyMd}">${bodyHtml}</div>
</div>`;
}

function renderBlockHtml(node: RootContent, blockIndex: number): string {
  return `<div class="block" data-block-index="${blockIndex}">
  ${nodeToHtml(node)}
  <button class="btn-add-comment" data-block-index="${blockIndex}" title="添加评论">+</button>
</div>`;
}

export function renderView(filePath: string, markdown: string): string {
  const tree = parser.runSync(parser.parse(markdown)) as Root;

  let blockIndex = 0;
  const sections: string[] = [];

  for (const node of tree.children) {
    if (isCommentNode(node)) {
      sections.push(
        renderCommentHtml(
          node.data.commentId,
          node.data.commentStatus,
          node.children as RootContent[],
        ),
      );
    } else {
      sections.push(renderBlockHtml(node, blockIndex));
      blockIndex++;
    }
  }

  return pageTemplate
    .replaceAll("{{TITLE}}", esc(filePath))
    .replace("{{FILE_RAW}}", esc(filePath))
    .replace("{{STYLE}}", styleSheet)
    .replace("{{SCRIPT}}", clientScript)
    .replace("{{CONTENT}}", sections.join("\n"))
    .replace("{{SUBMIT_LABEL}}", "保存");
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
    if (isCommentNode(node)) {
      const children = node.children as RootContent[];
      comments.push({
        id: node.data.commentId,
        blockIndex: index === 0 ? null : index - 1, // preceding block, or null if none
        status: node.data.commentStatus,
        body: childrenToMarkdown(children),
        bodyHtml: childrenToHtml(children),
      });
    } else {
      blocks.push({ index, html: nodeToHtml(node) });
      index++;
    }
  }

  return { title: documentTitle(tree, filePath), blocks, comments };
}
