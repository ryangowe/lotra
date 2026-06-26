#!/usr/bin/env bun
// Mirror `lotra --help` into the CLI block of every doc that documents it,
// so the docs never drift from the actual CLI.
import { join } from "node:path";
import { buildCli } from "../src/cli/cli.ts";

// Each doc carries one fenced block under `heading`, filled from `lotra --help`.
const targets = [
  { path: "../plugin/skills/lotra/SKILL.md", heading: "## CLI" },
  { path: "../README.md", heading: "## Commands" },
];

const help = buildCli().helpInformation().trimEnd();

for (const { path, heading } of targets) {
  const filePath = join(import.meta.dir, path);
  const block = new RegExp(`${heading}\\n\\n\`\`\`\\n[\\s\\S]*?\\n\`\`\``);
  const text = await Bun.file(filePath).text();
  if (!block.test(text)) {
    console.error(`No "${heading}" code block found in ${filePath}`);
    process.exit(1);
  }
  // Function replacement so `$` in help is never read as a backreference.
  await Bun.write(
    filePath,
    text.replace(block, () => `${heading}\n\n\`\`\`\n${help}\n\`\`\``),
  );
}
