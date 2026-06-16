import { test, expect, describe } from "bun:test";
import { renderView, getDocumentData } from "./render.ts";

describe("renderView", () => {
  test("renders GFM table as HTML table element", () => {
    const md = `| A | B |\n|---|---|\n| 1 | 2 |`;
    const html = renderView("test.md", md);
    expect(html).toContain("<table>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<th>B</th>");
    expect(html).toContain("<td>1</td>");
    expect(html).toContain("<td>2</td>");
  });

  test("renders multi-row table", () => {
    const md = [
      "| 状态 | 含义 |",
      "|---|---|",
      "| requested | 要求更改 |",
      "| note | 仅提示 |",
      "| resolved | 已解决 |",
    ].join("\n");
    const html = renderView("test.md", md);
    expect(html).toContain("<table>");
    expect(html).toContain("<td>requested</td>");
    expect(html).toContain("<td>要求更改</td>");
    expect(html).toContain("<td>仅提示</td>");
    expect(html).toContain("<td>已解决</td>");
  });

  test("renders table alongside other blocks", () => {
    const md = `# Title\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\nParagraph after.`;
    const html = renderView("test.md", md);
    expect(html).toContain("<table>");
    expect(html).toContain("Title");
    expect(html).toContain("Paragraph after.");
  });

  test("renders paragraph as HTML", () => {
    const html = renderView("test.md", "Hello world");
    expect(html).toContain("<p>Hello world</p>");
  });

  test("renders strikethrough (GFM)", () => {
    const html = renderView("test.md", "~~deleted~~");
    expect(html).toContain("<del>deleted</del>");
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
    "Second paragraph.",
  ].join("\n");

  test("uses the document h1 as title", () => {
    expect(getDocumentData("file.md", md).title).toBe("My Title");
  });

  test("falls back to the file path when there is no h1", () => {
    expect(getDocumentData("file.md", "Just a paragraph.").title).toBe(
      "file.md",
    );
  });

  test("returns blocks with sequential indices and rendered html", () => {
    const { blocks } = getDocumentData("file.md", md);
    expect(blocks.map((b) => b.index)).toEqual([0, 1, 2]);
    expect(blocks[0]?.html).toContain("My Title");
    expect(blocks[1]?.html).toContain("<p>First paragraph.</p>");
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
    const { comments } = getDocumentData("file.md", orphan);
    expect(comments[0]?.blockIndex).toBeNull();
  });
});
