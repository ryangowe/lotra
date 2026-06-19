import { test, expect } from "bun:test";
import { readPrompt, stripFrontmatter } from "../src/cli/prompt.ts";

test("stripFrontmatter drops the YAML block and leading blank line", () => {
  expect(stripFrontmatter("---\nname: x\n---\n\n# Title\n\nbody\n")).toBe(
    "# Title\n\nbody\n",
  );
});

test("stripFrontmatter passes through content without frontmatter", () => {
  expect(stripFrontmatter("# Title\n")).toBe("# Title\n");
});

test("readPrompt returns the skill body without frontmatter", async () => {
  const body = await readPrompt();
  expect(body.startsWith("# Review long output with lotra")).toBe(true);
  expect(body).not.toContain("description:");
  expect(body).toContain("lotra relay");
  expect(body.endsWith("\n")).toBe(true);
});
