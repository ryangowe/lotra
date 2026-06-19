import { test, expect, describe } from "bun:test";
import { getDocumentData } from "./render.ts";

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
    const { blocks } = getDocumentData("file.md", md);
    expect(blocks.map((b) => b.index)).toEqual([0, 1, 2]);
    expect(blocks[0]?.html).toContain("My Title");
    expect(blocks[0]?.heading).toEqual({ depth: 1, text: "My Title" });
    expect(blocks[1]?.heading).toBeNull();
    expect(blocks[2]?.heading).toEqual({ depth: 2, text: "Section" });
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
    const html = blocks.map((b) => b.html).join("");
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
    const html = blocks.map((b) => b.html).join("");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<del>gone</del>");
  });
});
