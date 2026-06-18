import { test, expect } from "bun:test";
import { join } from "node:path";
import { buildCli } from "../src/cli/cli.ts";

// The skill's CLI block is mirrored from `lotra --help` by scripts/sync-skill-cli.ts.
test("skill CLI block matches lotra --help", async () => {
  const skillPath = join(import.meta.dir, "../plugin/skills/lotra/SKILL.md");
  const skill = await Bun.file(skillPath).text();
  const help = buildCli("http://127.0.0.1:0").helpInformation().trimEnd();
  const match = skill.match(/## CLI\n\n```\n([\s\S]*?)\n```/);
  expect(match?.[1]).toBe(help);
});
