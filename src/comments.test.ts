import { test, expect, describe } from "bun:test";
import {
  extractComments,
  insertComment,
  editCommentBody,
  updateCommentStatus,
  removeComment,
  formatCommentsForStdout,
} from "./comments.ts";

const DOC_WITH_COMMENTS = `# Title

First paragraph here.

> [!comment] id="c1" status="requested"
> This data is **wrong**.

Second paragraph here.

> [!comment] id="c2" status="note"
> Just a hint.

Third paragraph here.
`;

const DOC_NO_COMMENTS = `# Title

First paragraph here.

Second paragraph here.

Third paragraph here.
`;

describe("extractComments", () => {
  test("extracts all comments with metadata", () => {
    const comments = extractComments(DOC_WITH_COMMENTS);
    expect(comments).toHaveLength(2);

    expect(comments[0]!.id).toBe("c1");
    expect(comments[0]!.status).toBe("requested");
    expect(comments[0]!.body).toContain("wrong");

    expect(comments[1]!.id).toBe("c2");
    expect(comments[1]!.status).toBe("note");
    expect(comments[1]!.body).toContain("hint");
  });

  test("captures paragraph text above comment", () => {
    const comments = extractComments(DOC_WITH_COMMENTS);
    expect(comments[0]!.paragraphText).toBe("First paragraph here.");
    expect(comments[1]!.paragraphText).toBe("Second paragraph here.");
  });

  test("returns empty array for doc without comments", () => {
    const comments = extractComments(DOC_NO_COMMENTS);
    expect(comments).toHaveLength(0);
  });

  test("handles resolved comments", () => {
    const doc = `Paragraph.

> [!comment] id="c1" status="resolved"
> Done.
`;
    const comments = extractComments(doc);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.status).toBe("resolved");
  });

  test("ignores non-comment blockquotes", () => {
    const doc = `Paragraph.

> Just a regular blockquote.

> [!comment] id="c1" status="requested"
> A real comment.
`;
    const comments = extractComments(doc);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.id).toBe("c1");
  });

  test("handles multiline comment body", () => {
    const doc = `Paragraph.

> [!comment] id="c1" status="requested"
> Line one.
>
> - Item A
> - Item B
`;
    const comments = extractComments(doc);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.body).toContain("Line one.");
    expect(comments[0]!.body).toContain("Item A");
  });

  test("captures heading text when comment follows a heading", () => {
    const doc = `# My Heading

> [!comment] id="c1" status="requested"
> Fix this heading.
`;
    const comments = extractComments(doc);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.paragraphText).toBe("# My Heading");
  });

  test("captures list text when comment follows a list", () => {
    const doc = `- Item A
- Item B

> [!comment] id="c1" status="requested"
> Fix the list.
`;
    const comments = extractComments(doc);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.paragraphText).toContain("Item A");
    expect(comments[0]!.paragraphText).toContain("Item B");
  });
});

describe("insertComment", () => {
  test("inserts comment after specified block", () => {
    const result = insertComment(
      DOC_NO_COMMENTS,
      2,
      "c1",
      "requested",
      "Fix this.",
    );
    const comments = extractComments(result);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.id).toBe("c1");
    expect(comments[0]!.paragraphText).toBe("Second paragraph here.");
  });

  test("inserts after heading", () => {
    const result = insertComment(
      DOC_NO_COMMENTS,
      0,
      "c1",
      "requested",
      "Fix title.",
    );
    const comments = extractComments(result);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.paragraphText).toBe("# Title");
  });

  test("inserts after first paragraph", () => {
    const result = insertComment(
      DOC_NO_COMMENTS,
      1,
      "c1",
      "requested",
      "Fix this.",
    );
    const comments = extractComments(result);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.paragraphText).toContain("First paragraph");
  });

  test("inserts after last paragraph", () => {
    const result = insertComment(
      DOC_NO_COMMENTS,
      3,
      "c1",
      "requested",
      "Fix this.",
    );
    const comments = extractComments(result);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.paragraphText).toContain("Third paragraph");
  });

  test("throws for out-of-range block index", () => {
    expect(() =>
      insertComment(DOC_NO_COMMENTS, 99, "c1", "requested", "Fix."),
    ).toThrow("out of range");
  });

  test("appends after existing comments on same block", () => {
    let result = insertComment(
      DOC_NO_COMMENTS,
      1,
      "c1",
      "requested",
      "First comment.",
    );
    result = insertComment(result, 1, "c2", "requested", "Second comment.");
    const comments = extractComments(result);
    expect(comments).toHaveLength(2);
    expect(comments[0]!.id).toBe("c1");
    expect(comments[1]!.id).toBe("c2");
  });
});

describe("updateCommentStatus", () => {
  test("updates single comment status", () => {
    const result = updateCommentStatus(DOC_WITH_COMMENTS, ["c1"], "resolved");
    const comments = extractComments(result);
    expect(comments.find((c) => c.id === "c1")!.status).toBe("resolved");
    expect(comments.find((c) => c.id === "c2")!.status).toBe("note");
  });

  test("updates multiple comments at once", () => {
    const result = updateCommentStatus(
      DOC_WITH_COMMENTS,
      ["c1", "c2"],
      "resolved",
    );
    const comments = extractComments(result);
    expect(comments.every((c) => c.status === "resolved")).toBe(true);
  });

  test("leaves non-matching comments unchanged", () => {
    const result = updateCommentStatus(
      DOC_WITH_COMMENTS,
      ["nonexistent"],
      "resolved",
    );
    const comments = extractComments(result);
    expect(comments[0]!.status).toBe("requested");
    expect(comments[1]!.status).toBe("note");
  });
});

describe("editCommentBody", () => {
  test("replaces comment body", () => {
    const result = editCommentBody(DOC_WITH_COMMENTS, "c1", "New body text.");
    const comments = extractComments(result);
    expect(comments[0]!.id).toBe("c1");
    expect(comments[0]!.body).toContain("New body text.");
    expect(comments[0]!.body).not.toContain("wrong");
  });

  test("preserves other comments", () => {
    const result = editCommentBody(DOC_WITH_COMMENTS, "c1", "Changed.");
    const comments = extractComments(result);
    expect(comments).toHaveLength(2);
    expect(comments[1]!.body).toContain("hint");
  });

  test("preserves comment status", () => {
    const result = editCommentBody(DOC_WITH_COMMENTS, "c1", "Changed.");
    const comments = extractComments(result);
    expect(comments[0]!.status).toBe("requested");
  });

  test("no-op for nonexistent id", () => {
    const result = editCommentBody(DOC_WITH_COMMENTS, "nope", "Changed.");
    const comments = extractComments(result);
    expect(comments[0]!.body).toContain("wrong");
  });
});

describe("removeComment", () => {
  test("removes a comment by id", () => {
    const result = removeComment(DOC_WITH_COMMENTS, "c1");
    const comments = extractComments(result);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.id).toBe("c2");
  });

  test("preserves surrounding content", () => {
    const result = removeComment(DOC_WITH_COMMENTS, "c1");
    expect(result).toContain("First paragraph");
    expect(result).toContain("Second paragraph");
  });

  test("no-op for nonexistent id", () => {
    const result = removeComment(DOC_WITH_COMMENTS, "nonexistent");
    const comments = extractComments(result);
    expect(comments).toHaveLength(2);
  });
});

describe("formatCommentsForStdout", () => {
  test("formats only requested comments", () => {
    const comments = extractComments(DOC_WITH_COMMENTS);
    const output = formatCommentsForStdout(comments);
    expect(output).toContain('<comment id="c1">');
    expect(output).not.toContain('<comment id="c2">');
  });

  test("includes cite with paragraph text", () => {
    const comments = extractComments(DOC_WITH_COMMENTS);
    const output = formatCommentsForStdout(comments);
    expect(output).toContain("<cite>First paragraph here.</cite>");
  });

  test("truncates long paragraph text", () => {
    const longPara = "A".repeat(200);
    const doc = `${longPara}

> [!comment] id="c1" status="requested"
> Fix.
`;
    const comments = extractComments(doc);
    const output = formatCommentsForStdout(comments, 50);
    expect(output).toContain("...");
    const cite = output.match(/<cite>(.*?)<\/cite>/s)?.[1] ?? "";
    expect(cite.length).toBeLessThanOrEqual(50);
  });

  test("returns empty string when no requested comments", () => {
    const doc = `Paragraph.

> [!comment] id="c1" status="note"
> Just a note.
`;
    const comments = extractComments(doc);
    const output = formatCommentsForStdout(comments);
    expect(output).toBe("");
  });
});
