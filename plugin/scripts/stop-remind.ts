#!/usr/bin/env bun
// Stop hook: nudge the agent toward lotra when a reply is moderately long.
// Writes the reply to a tmp file so the agent only needs to run one command.
// additionalContext continues the turn once (stop_hook_active guards re-firing).
import { readStopInput, dumpForReview } from "./stop-input.ts";
import { REMIND_LINES, GATE_LINES } from "./config.ts";

const input = await readStopInput();

if (
  input.stopHookActive ||
  input.lineCount < REMIND_LINES ||
  input.lineCount >= GATE_LINES
) {
  process.exit(0);
}

const file = await dumpForReview(input);

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext:
        `That reply was ${input.lineCount} lines and has been saved to ${file}. ` +
        "If it needs human feedback, run `lotra relay " +
        file +
        "` to collect inline comments.",
    },
  }),
);
