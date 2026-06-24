#!/usr/bin/env bun
// SessionStart hook: inject instructions for proactive lotra usage.
import { REMIND_LINES } from "./config.ts";

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext:
        `When your reply exceeds ${REMIND_LINES} lines and contains content that benefits from ` +
        "line-by-line review (specs, plans, long prose, code reviews, changelogs), " +
        "use the lotra skill so the human can comment inline instead of reading a wall of text in the terminal.",
    },
  }),
);
