import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { GATE_LINES } from "../plugin/scripts/config.ts";

const SCRIPTS = join(import.meta.dir, "../plugin/scripts");

async function runHook(
  script: string,
  input: Record<string, unknown>,
): Promise<{ stdout: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", join(SCRIPTS, script)], {
    stdin: new TextEncoder().encode(JSON.stringify(input)),
    stdout: "pipe",
    stderr: "ignore",
  });
  const [stdout, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);
  return { stdout, exitCode };
}

describe("plan-gate hook", () => {
  test("short plan below the gate → exits without deciding", async () => {
    const plan = Array.from(
      { length: GATE_LINES - 5 },
      (_, i) => `line ${i}`,
    ).join("\n");
    const r = await runHook("plan-gate.ts", {
      tool_name: "ExitPlanMode",
      tool_input: { plan },
    });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe("");
  });
});
