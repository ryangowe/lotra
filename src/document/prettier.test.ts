import { test, expect, describe } from "bun:test";
import { prettify } from "./prettier.ts";

describe("prettify", () => {
  test("splits list with 3+ items", () => {
    const input = "- Alpha\n- Beta\n- Gamma\n";
    const output = prettify(input);
    const items = output.split("\n\n").filter((s) => s.trim());
    expect(items).toHaveLength(3);
  });

  test("splits ordered list with 3+ items", () => {
    const input = "1. First\n2. Second\n3. Third\n";
    const output = prettify(input);
    const items = output.split("\n\n").filter((s) => s.trim());
    expect(items).toHaveLength(3);
  });

  test("preserves short 2-item list", () => {
    const input = "- Short A\n- Short B\n";
    const output = prettify(input);
    expect(output).not.toContain("\n\n");
  });

  test("splits 2-item list when an item is long", () => {
    const input =
      "- This item has more than forty characters in it easily\n- Short\n";
    const output = prettify(input);
    const items = output.split("\n\n").filter((s) => s.trim());
    expect(items).toHaveLength(2);
  });

  test("preserves single-item lists unchanged", () => {
    const input = "- Only one\n";
    const output = prettify(input);
    expect(output).toBe("- Only one\n");
  });

  test("preserves non-list content", () => {
    const input = "# Title\n\nA paragraph.\n\n```js\ncode();\n```\n";
    const output = prettify(input);
    expect(output).toContain("# Title");
    expect(output).toContain("A paragraph.");
    expect(output).toContain("code();");
  });

  test("handles mixed content with 3-item list", () => {
    const input = "# Title\n\nIntro.\n\n- A\n- B\n- C\n\nOutro.\n";
    const output = prettify(input);
    expect(output).toContain("# Title");
    expect(output).toContain("Intro.");
    expect(output).toContain("Outro.");
    const items = output.split("\n\n").filter((s) => s.trim());
    expect(items).toHaveLength(6);
  });

  test("round-trip stable: prettify(prettify(x)) === prettify(x)", () => {
    const input = "# Doc\n\n- A\n- B\n- C\n\n1. X\n2. Y\n\nDone.\n";
    const once = prettify(input);
    const twice = prettify(once);
    expect(twice).toBe(once);
  });

  test("preserves nested content within list items", () => {
    const input = "- Item with **bold**\n- Item with `code`\n";
    const output = prettify(input);
    expect(output).toContain("**bold**");
    expect(output).toContain("`code`");
  });
});
