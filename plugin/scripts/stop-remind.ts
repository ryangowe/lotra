#!/usr/bin/env bun
// Stop hook: nudge the agent toward lotra when a reply is moderately long.
// additionalContext continues the turn once (stop_hook_active guards re-firing).
import { readStopInput } from "./stop-input.ts";
import { REMIND_LINES, GATE_LINES } from "./config.ts";

const { lineCount, stopHookActive } = await readStopInput();

if (stopHookActive || lineCount < REMIND_LINES || lineCount >= GATE_LINES) {
  process.exit(0);
}

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext:
        `That reply was ${lineCount} lines. If it is a document or long answer the human should review, ` +
        "write it to a file and run `lotra relay <file>` to collect inline comments. Otherwise you may stop.",
    },
  }),
);
