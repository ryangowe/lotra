import { test, expect, describe } from "bun:test";
import { sanitize } from "./sanitize.ts";

describe("sanitize", () => {
  test("accepts plain text", () => {
    expect(sanitize("Hello world").valid).toBe(true);
  });

  test("accepts bold and italic", () => {
    expect(sanitize("This is **bold** and *italic*.").valid).toBe(true);
  });

  test("accepts inline code", () => {
    expect(sanitize("See `config.yaml` for details.").valid).toBe(true);
  });

  test("accepts links", () => {
    expect(sanitize("See [this doc](https://example.com).").valid).toBe(true);
  });

  test("accepts lists", () => {
    expect(sanitize("- Item one\n- Item two").valid).toBe(true);
  });

  test("accepts multiline text", () => {
    expect(sanitize("Line one.\n\nLine two.").valid).toBe(true);
  });

  test("rejects empty input", () => {
    const result = sanitize("");
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("空");
  });

  test("rejects whitespace-only input", () => {
    expect(sanitize("   \n  ").valid).toBe(false);
  });

  test("rejects headings", () => {
    const result = sanitize("# This is a heading");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("标题"))).toBe(true);
  });

  test("rejects code blocks", () => {
    const result = sanitize("```\ncode here\n```");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("代码块"))).toBe(true);
  });

  test("rejects blockquotes", () => {
    const result = sanitize("> quoted text");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("块引用"))).toBe(true);
  });

  test("rejects HTML tags", () => {
    const result = sanitize("<div>html</div>");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("HTML"))).toBe(true);
  });

  test("rejects consecutive blank lines", () => {
    const result = sanitize("line one\n\n\nline two");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("空行"))).toBe(true);
  });

  test("rejects images", () => {
    const result = sanitize("![alt](image.png)");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("图片"))).toBe(true);
  });

  test("accepts underscore-style emphasis", () => {
    expect(sanitize("This is _italic_ and __bold__.").valid).toBe(true);
  });

  test("accepts asterisk-style lists", () => {
    expect(sanitize("* Item one\n* Item two").valid).toBe(true);
  });
});
