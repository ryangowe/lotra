#!/usr/bin/env bun
// Mirror `lotra --help` into the skill's CLI block so the docs never drift from the CLI.
import { join } from "node:path";
import { buildCli } from "../src/cli/cli.ts";

const skillPath = join(import.meta.dir, "../plugin/skills/lotra/SKILL.md");
const block = /## CLI\n\n```\n[\s\S]*?\n```/;

const help = buildCli().helpInformation().trimEnd();
const skill = await Bun.file(skillPath).text();

if (!block.test(skill)) {
  console.error(`No "## CLI" code block found in ${skillPath}`);
  process.exit(1);
}

await Bun.write(
  skillPath,
  skill.replace(block, () => "## CLI\n\n```\n" + help + "\n```"),
);
