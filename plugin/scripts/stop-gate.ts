#!/usr/bin/env bun
// Stop hook (asyncRewake): on a long reply, dump it outside the project and relay
// human review back to the agent. Runs in the background so the turn is not held.
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readStopInput } from "./stop-input.ts";
import { lotraPackage } from "./lotra-cli.ts";
import { GATE_LINES } from "./config.ts";

const { lastMessage, lineCount, sessionId } = await readStopInput();

if (lineCount < GATE_LINES) process.exit(0);

// Fresh file per dump: a unique path dodges the daemon's in-memory cache, so each
// review round reads the latest text instead of a stale first load.
const dir = join(tmpdir(), "lotra-review");
await mkdir(dir, { recursive: true });
const file = join(dir, `${sessionId}-${Date.now()}.md`);
await Bun.write(file, lastMessage);

// Pin the CLI to this plugin's version so the hook and the published CLI never drift.
// `bun x` fetches it on demand; a missing/offline/unpublished version yields empty
// stdout and degrades to a no-op. lotra relay opens the browser and blocks until the
// human submits comments.
const proc = Bun.spawn(["bun", "x", await lotraPackage(), "relay", file], {
  stdout: "pipe",
  stderr: "ignore",
});
const comments = (await new Response(proc.stdout).text()).trim();
await proc.exited;

if (!comments) process.exit(0); // no feedback → leave the turn stopped

// asyncRewake surfaces stderr to Claude as a system reminder on exit code 2.
console.error(
  `Your reply was long (${lineCount} lines) and was dumped to ${file} for human review.\n\n` +
    `Human comments:\n${comments}\n\nRevise your answer to address them.`,
);
process.exit(2);
