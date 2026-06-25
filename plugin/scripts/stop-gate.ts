#!/usr/bin/env bun
// Stop hook (asyncRewake): on a long reply, dump it outside the project and route
// human review back to the agent. Runs in the background so the turn is not held.
import { readStopInput, dumpForReview } from "./stop-input.ts";
import { lotraReviewArgs } from "./lotra-cli.ts";
import { GATE_LINES } from "./config.ts";

const input = await readStopInput();

if (input.lineCount < GATE_LINES) process.exit(0);

const file = await dumpForReview(input);

const proc = Bun.spawn(await lotraReviewArgs(file), {
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
