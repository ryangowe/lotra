import { test, expect } from "bun:test";
import { join } from "node:path";
import { buildCli } from "../src/cli/cli.ts";

// Each doc's CLI block is mirrored from `lotra --help` by scripts/sync-cli-docs.ts.
const targets = [
  { path: "../plugin/skills/lotra/SKILL.md", heading: "## CLI" },
  { path: "../README.md", heading: "## Commands" },
];

for (const { path, heading } of targets) {
  test(`${heading} block in ${path} matches lotra --help`, async () => {
    const text = await Bun.file(join(import.meta.dir, path)).text();
    const help = buildCli().helpInformation().trimEnd();
    const block = new RegExp(`${heading}\\n\\n\`\`\`\\n([\\s\\S]*?)\\n\`\`\``);
    expect(text.match(block)?.[1]).toBe(help);
  });
}
