#!/usr/bin/env bun
// Stop hook (asyncRewake): on a long reply, dump it outside the project and relay
// human review back to the agent. Runs in the background so the turn is not held.
import { readStopInput, dumpForReview } from "./stop-input.ts";
import { lotraPackage } from "./lotra-cli.ts";
import { GATE_LINES } from "./config.ts";

const input = await readStopInput();

if (input.lineCount < GATE_LINES) process.exit(0);

const file = await dumpForReview(input);

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

console.error(
  `Your reply was dumped to ${file} "
  "and received the following user comments via lotra:\n\n"
  "${comments}`,
);
process.exit(2);
