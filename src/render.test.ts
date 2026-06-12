import { test, expect, describe } from "bun:test";
import { renderView } from "./render.ts";

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
