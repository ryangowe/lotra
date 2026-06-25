import { test, expect, describe } from "bun:test";
import { getDocumentData } from "./render.ts";
import { insertComment } from "./comments.ts";
import type { NodeBlock } from "../shared/types.ts";

describe("list as a cohesive block", () => {
  const listDoc = [
    "Intro.",
    "",
    "1. First",
    "2. Second",
    "3. Third",
    "",
    "Outro.",
  ].join("\n");

  test("groups a list into one block whose items carry their own anchors", () => {
    const { blocks } = getDocumentData("f.md", listDoc);
    expect(blocks).toHaveLength(3); // intro, the list, outro
    const list = blocks[1];
    expect(list?.kind).toBe("list");
    if (list?.kind !== "list") throw new Error("expected a list block");
    expect(list.ordered).toBe(true);
    expect(list.items.map((it) => it.index)).toEqual([1, 2, 3]);
    expect(list.items[0]?.html).toContain("First");
    expect(list.items[1]?.html).toContain("Second");
  });

  test("anchors a comment nested in a list item to that item's index", () => {
    const withComment = insertComment(listDoc, 2, "c1", "requested", "fix");
    const { blocks, comments } = getDocumentData("f.md", withComment);
    expect(blocks).toHaveLength(3);
    expect(comments).toHaveLength(1);
    expect(comments[0]?.blockIndex).toBe(2);
  });

  // A comment is additive: adding one must never change the block count, at any
  // anchor (intro=0, items=1/2/3, outro=4).
  test("adding a comment never changes the block count", () => {
    expect(getDocumentData("f.md", listDoc).blocks).toHaveLength(3);
    for (let i = 0; i <= 4; i++) {
      const withComment = insertComment(listDoc, i, "c", "requested", "x");
      expect(getDocumentData("f.md", withComment).blocks).toHaveLength(3);
    }
  });
});

describe("getDocumentData", () => {
  const md = [
    "# My Title",
    "",
    "First paragraph.",
    "",
    '> [!comment] id="c1" status="requested"',
    "> please fix **this**",
    "",
    "## Section",
  ].join("\n");

  test("uses the document h1 as title", () => {
    expect(getDocumentData("file.md", md).title).toBe("My Title");
  });

  test("falls back to the file path when there is no h1", () => {
    expect(getDocumentData("file.md", "Just a paragraph.").title).toBe(
      "file.md",
    );
  });

  test("returns blocks with sequential indices, html, and heading metadata", () => {
    const nodes = getDocumentData("file.md", md).blocks.filter(
      (b): b is NodeBlock => b.kind === "node",
    );
    expect(nodes).toHaveLength(3);
    expect(nodes.map((b) => b.index)).toEqual([0, 1, 2]);
    expect(nodes[0]?.html).toContain("My Title");
    expect(nodes[0]?.heading).toEqual({ depth: 1, text: "My Title" });
    expect(nodes[1]?.heading).toBeNull();
    expect(nodes[2]?.heading).toEqual({ depth: 2, text: "Section" });
  });

  test("anchors a comment to its preceding block with md + html bodies", () => {
    const { comments } = getDocumentData("file.md", md);
    expect(comments).toHaveLength(1);
    const c = comments[0];
    expect(c?.id).toBe("c1");
    expect(c?.status).toBe("requested");
    expect(c?.blockIndex).toBe(1);
    expect(c?.body).toBe("please fix **this**");
    expect(c?.bodyHtml).toContain("<strong>this</strong>");
  });

  test("anchors a comment that precedes all blocks to null", () => {
    const orphan = [
      '> [!comment] id="c0" status="note"',
      "> orphan note",
      "",
      "# Title",
    ].join("\n");
    expect(
      getDocumentData("file.md", orphan).comments[0]?.blockIndex,
    ).toBeNull();
  });

  test("strips YAML front matter from rendered output", () => {
    const withFm = [
      "---",
      "title: Hello",
      "date: 2026-01-01",
      "---",
      "",
      "# Hello",
      "",
      "Body text.",
    ].join("\n");
    const { blocks, title } = getDocumentData("file.md", withFm);
    expect(title).toBe("Hello");
    const html = blocks.map((b) => (b.kind === "node" ? b.html : "")).join("");
    expect(html).not.toContain("<hr");
    expect(html).not.toContain("title:");
    expect(html).not.toContain("date:");
    expect(blocks).toHaveLength(2);
  });

  test("renders GFM tables and strikethrough in block html", () => {
    const { blocks } = getDocumentData(
      "file.md",
      "| A | B |\n|---|---|\n| 1 | 2 |\n\n~~gone~~",
    );
    const html = blocks.map((b) => (b.kind === "node" ? b.html : "")).join("");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<del>gone</del>");
  });
});
