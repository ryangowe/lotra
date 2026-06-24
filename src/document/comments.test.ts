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

const DOC_WITH_FRONTMATTER = `---
title: Hello
date: 2026-01-01
---

# Hello

Body text.
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

  test("cites the single list item a comment is anchored to", () => {
    const doc = `- Item A
- Item B
`;
    const withComment = insertComment(doc, 0, "c1", "requested", "Fix this.");
    const comments = extractComments(withComment);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.paragraphText).toBe("- Item A");
    expect(comments[0]!.paragraphText).not.toContain("Item B");
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

  test("throws when block already has a comment", () => {
    const result = insertComment(
      DOC_NO_COMMENTS,
      1,
      "c1",
      "requested",
      "First comment.",
    );
    expect(() =>
      insertComment(result, 1, "c2", "requested", "Second comment."),
    ).toThrow("already has a comment");
  });

  test("nests a comment in the target list item and keeps the list whole", () => {
    const listDoc = `1. First\n2. Second\n3. Third\n`;
    const result = insertComment(listDoc, 1, "c1", "requested", "Fix second.");

    // The callout is nested under "2. Second", not a sibling that splits the list.
    expect(result).toContain('   > [!comment] id="c1" status="requested"');
    expect(result).toContain("1. First");
    expect(result).toContain("3. Third");

    const comments = extractComments(result);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.paragraphText).toBe("2. Second");

    // A second comment on another item coexists; the list never collapses.
    const both = insertComment(result, 2, "c2", "note", "Fix third.");
    expect(extractComments(both)).toHaveLength(2);
  });

  test("a second comment on the same list item is rejected", () => {
    const listDoc = `- Only item\n`;
    const result = insertComment(listDoc, 0, "c1", "requested", "First.");
    expect(() =>
      insertComment(result, 0, "c2", "requested", "Second."),
    ).toThrow("already has a comment");
  });
});

describe("front matter handling", () => {
  test("insertComment skips yaml node when counting blocks", () => {
    const result = insertComment(
      DOC_WITH_FRONTMATTER,
      0,
      "c1",
      "requested",
      "Fix title.",
    );
    const comments = extractComments(result);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.paragraphText).toBe("# Hello");
  });

  test("insertComment targets correct block after front matter", () => {
    const result = insertComment(
      DOC_WITH_FRONTMATTER,
      1,
      "c1",
      "requested",
      "Fix body.",
    );
    const comments = extractComments(result);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.paragraphText).toBe("Body text.");
  });

  test("extractComments does not use yaml node as paragraph text", () => {
    const docWithCommentAfterFm = `---
title: Hello
---

> [!comment] id="c1" status="requested"
> Orphan note.

# Hello
`;
    const comments = extractComments(docWithCommentAfterFm);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.paragraphText).toBe("");
  });

  test("round-trips front matter through comment operations", () => {
    const result = insertComment(
      DOC_WITH_FRONTMATTER,
      0,
      "c1",
      "requested",
      "Fix title.",
    );
    expect(result).toContain("---\ntitle: Hello\ndate: 2026-01-01\n---");
    const removed = removeComment(result, "c1");
    expect(removed).toContain("---\ntitle: Hello\ndate: 2026-01-01\n---");
    expect(removed).toContain("# Hello");
    expect(removed).toContain("Body text.");
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

  test("removes a comment nested inside a list item, leaving the list whole", () => {
    const doc = `- Item A\n- Item B\n`;
    const withComments = insertComment(
      insertComment(doc, 0, "c1", "requested", "Fix A."),
      1,
      "c2",
      "note",
      "Fix B.",
    );
    const result = removeComment(withComments, "c1");
    const comments = extractComments(result);
    expect(comments).toHaveLength(1);
    expect(comments[0]!.id).toBe("c2");
    expect(comments[0]!.paragraphText).toBe("- Item B");
  });

  test("no-op for nonexistent id", () => {
    const result = removeComment(DOC_WITH_COMMENTS, "nonexistent");
    const comments = extractComments(result);
    expect(comments).toHaveLength(2);
  });
});

describe("formatCommentsForStdout", () => {
  test("formats requested as <comment> and notes as <note>", () => {
    const comments = extractComments(DOC_WITH_COMMENTS);
    const output = formatCommentsForStdout(comments);
    expect(output).toContain('<comment id="c1">');
    expect(output).toContain('<note id="c2">');
  });

  test("excludeNotes omits notes", () => {
    const comments = extractComments(DOC_WITH_COMMENTS);
    const output = formatCommentsForStdout(comments, { excludeNotes: true });
    expect(output).toContain('<comment id="c1">');
    expect(output).not.toContain("c2");
  });

  test("every tag sits on its own line", () => {
    const comments = extractComments(DOC_WITH_COMMENTS);
    const output = formatCommentsForStdout(comments);
    const lines = output.split("\n");
    for (const tag of ["<cite>", "</cite>", "</comment>", "</note>"]) {
      const tagLines = lines.filter((l) => l.includes(tag));
      for (const line of tagLines) {
        expect(line.trim()).toBe(tag);
      }
    }
    const openLines = lines.filter(
      (l) => l.startsWith("<comment ") || l.startsWith("<note "),
    );
    for (const line of openLines) {
      expect(line).toMatch(/^<(comment|note) .+>$/);
    }
  });

  test("cite and body are between their tags", () => {
    const comments = extractComments(DOC_WITH_COMMENTS);
    const output = formatCommentsForStdout(comments);
    expect(output).toContain("<cite>\nFirst paragraph here.\n</cite>");
    expect(output).toContain(
      '<comment id="c1">\nThis data is **wrong**.\n</comment>',
    );
    expect(output).toContain("<cite>\nSecond paragraph here.\n</cite>");
    expect(output).toContain('<note id="c2">\nJust a hint.\n</note>');
  });

  test("truncates multiline cite exceeding threshold to first and last line", () => {
    const longPara = "line one\nline two\nline three\nline four";
    const doc = `${longPara}

> [!comment] id="c1" status="requested"
> Fix.
`;
    const comments = extractComments(doc);
    const output = formatCommentsForStdout(comments, { maxCiteLength: 10 });
    const cite = output.match(/<cite>\n(.*?)\n<\/cite>/s)?.[1] ?? "";
    expect(cite).toBe("line one\n...\nline four");
  });

  test("does not truncate when lines <= 2 even if over threshold", () => {
    const longPara = "A".repeat(200);
    const doc = `${longPara}

> [!comment] id="c1" status="requested"
> Fix.
`;
    const comments = extractComments(doc);
    const output = formatCommentsForStdout(comments, { maxCiteLength: 50 });
    const cite = output.match(/<cite>\n(.*?)\n<\/cite>/s)?.[1] ?? "";
    expect(cite).toBe(longPara);
  });

  test("empty cite still has tag on own line", () => {
    const doc = `> [!comment] id="c1" status="requested"
> Orphan comment.
`;
    const comments = extractComments(doc);
    const output = formatCommentsForStdout(comments);
    expect(output).toContain("<cite>\n</cite>");
  });

  test("returns empty string when no actionable comments", () => {
    const doc = `Paragraph.

> [!comment] id="c1" status="resolved"
> Done.
`;
    const comments = extractComments(doc);
    const output = formatCommentsForStdout(comments);
    expect(output).toBe("");
  });

  test("returns empty string when only notes and excludeNotes is true", () => {
    const doc = `Paragraph.

> [!comment] id="c1" status="note"
> Just a note.
`;
    const comments = extractComments(doc);
    const output = formatCommentsForStdout(comments, { excludeNotes: true });
    expect(output).toBe("");
  });
});
