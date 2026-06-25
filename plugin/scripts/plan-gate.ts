#!/usr/bin/env bun
// PreToolUse(ExitPlanMode) hook: route a long plan through lotra for inline review,
// then feed the comments back so the agent revises the plan before it is approved.
// Blocks the tool call until review returns.
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { countLines } from "./stop-input.ts";
import { lotraPackage } from "./lotra-cli.ts";
import { GATE_LINES } from "./config.ts";

const data = JSON.parse((await Bun.stdin.text()) || "{}");
const plan: string = data.tool_input?.plan ?? "";

// Short plans read fine in the native approval selector; only long ones earn a browser
// round-trip. Same bar as the Stop gate.
if (countLines(plan) < GATE_LINES) process.exit(0);

// Dump to tmp (not the live plan file) so lotra's comment callouts stay out of the
// project and Claude's own plan file; a fresh path dodges the daemon's cache.
const dir = join(tmpdir(), "lotra-review");
await mkdir(dir, { recursive: true });
const file = join(dir, `${data.session_id ?? "session"}-${Date.now()}.md`);
await Bun.write(file, plan);

const pkg = await lotraPackage();
const proc = Bun.spawn(["bun", "x", pkg, "review", file], {
  stdout: "pipe",
  stderr: "ignore",
});
const out = (await new Response(proc.stdout).text()).trim();
await proc.exited;

// No comments surfaces as a single status line (or nothing); a real comment is a
// multi-line block. Fall through to the native plan-approval selector when there is
// nothing actionable.
if (out.split("\n").filter((l) => l.trim() !== "").length <= 1) process.exit(0);

// Deny ExitPlanMode so the agent stays in plan mode; permissionDecisionReason is shown
// to the agent, which revises the plan and calls ExitPlanMode again.
console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason:
        "Your plan was reviewed in lotra with these comments. Revise the plan, " +
        "then call ExitPlanMode again to re-present it:\n\n" +
        out,
    },
  }),
);
process.exit(0);
