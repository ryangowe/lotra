import { test, expect, describe } from "bun:test";
import type { Root, Blockquote } from "mdast";
import { isCommentNode, buildCalloutHeader } from "./remark-comment.ts";
import { parser } from "./parser.ts";

function parse(md: string): Root {
  return parser.runSync(parser.parse(md));
}

function firstBlockquote(tree: Root): Blockquote {
  return tree.children[0] as Blockquote;
}

describe("remarkComment plugin", () => {
  test("attaches commentId and commentStatus to matching blockquotes", () => {
    const tree = parse(`> [!comment] id="c1" status="requested"\n> Fix this.`);
    const bq = firstBlockquote(tree);
    expect(bq.type).toBe("blockquote");
    expect(bq.data?.commentId).toBe("c1");
    expect(bq.data?.commentStatus).toBe("requested");
  });

  test("strips header from body, preserves remaining content", () => {
    const tree = parse(
      `> [!comment] id="c1" status="requested"\n> Body text here.`,
    );
    const bq = firstBlockquote(tree);
    const firstPara = bq.children[0];
    expect(firstPara?.type).toBe("paragraph");
    if (firstPara?.type === "paragraph") {
      const text = firstPara.children[0];
      expect(text?.type).toBe("text");
      if (text?.type === "text") {
        expect(text.value).toBe("Body text here.");
      }
    }
  });

  test("handles comment with no body", () => {
    const bq = firstBlockquote(parse(`> [!comment] id="c1" status="note"`));
    expect(bq.data?.commentId).toBe("c1");
    expect(bq.children).toHaveLength(0);
  });

  test("handles multiline body", () => {
    const bq = firstBlockquote(
      parse(
        `> [!comment] id="c1" status="requested"\n> Line one.\n>\n> Line two.`,
      ),
    );
    expect(bq.data?.commentId).toBe("c1");
    expect(bq.children.length).toBeGreaterThanOrEqual(2);
  });

  test("ignores regular blockquotes", () => {
    const bq = firstBlockquote(parse(`> Just a normal quote.`));
    expect(bq.data?.commentId).toBeUndefined();
  });

  test("ignores blockquotes with other callout types", () => {
    const bq = firstBlockquote(parse(`> [!note]\n> Some note.`));
    expect(bq.data?.commentId).toBeUndefined();
  });

  test("rejects invalid status values", () => {
    const bq = firstBlockquote(parse(`> [!comment] id="c1" status="invalid"`));
    expect(bq.data?.commentId).toBeUndefined();
  });

  test("rejects missing id", () => {
    const bq = firstBlockquote(parse(`> [!comment] status="requested"`));
    expect(bq.data?.commentId).toBeUndefined();
  });

  test("rejects missing status", () => {
    const bq = firstBlockquote(parse(`> [!comment] id="c1"`));
    expect(bq.data?.commentId).toBeUndefined();
  });

  test("handles all three status values", () => {
    for (const status of ["requested", "note", "resolved"] as const) {
      const bq = firstBlockquote(
        parse(`> [!comment] id="c1" status="${status}"\n> Body.`),
      );
      expect(bq.data?.commentStatus).toBe(status);
    }
  });
});

describe("isCommentNode", () => {
  test("returns true for comment blockquotes", () => {
    const tree = parse(`> [!comment] id="c1" status="requested"\n> Body.`);
    expect(isCommentNode(tree.children[0]!)).toBe(true);
  });

  test("returns false for regular blockquotes", () => {
    const tree = parse(`> Normal quote.`);
    expect(isCommentNode(tree.children[0]!)).toBe(false);
  });

  test("returns false for non-blockquote nodes", () => {
    const tree = parse(`Just a paragraph.`);
    expect(isCommentNode(tree.children[0]!)).toBe(false);
  });
});

describe("buildCalloutHeader", () => {
  test("produces correct header string", () => {
    expect(buildCalloutHeader("c1", "requested")).toBe(
      '[!comment] id="c1" status="requested"',
    );
  });
});
