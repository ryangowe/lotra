import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readdir } from "node:fs/promises";
import { countLines, parseStopInput } from "../plugin/scripts/stop-input.ts";
import { lotraPackage, lotraReviewArgs } from "../plugin/scripts/lotra-cli.ts";
import { GATE_LINES } from "../plugin/scripts/config.ts";

const SCRIPTS = join(import.meta.dir, "../plugin/scripts");

// Derived from the single-source thresholds so tests track config changes.
const AT_GATE = GATE_LINES + 5;
const BELOW_GATE = GATE_LINES - 5;

function lines(n: number): string {
  return Array.from({ length: n }, (_, i) => `line ${i}`).join("\n");
}

async function runHook(
  script: string,
  input: Record<string, unknown>,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["bun", join(SCRIPTS, script)], {
    stdin: new TextEncoder().encode(JSON.stringify(input)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

describe("countLines", () => {
  test("empty is zero", () => expect(countLines("")).toBe(0));
  test("single line", () => expect(countLines("hello")).toBe(1));
  test("two lines", () => expect(countLines("a\nb")).toBe(2));
  test("trailing newline does not inflate", () =>
    expect(countLines("a\nb\n")).toBe(2));
});

describe("parseStopInput", () => {
  test("empty payload", () => {
    const r = parseStopInput("");
    expect(r.lineCount).toBe(0);
    expect(r.stopHookActive).toBe(false);
    expect(r.sessionId).toBe("session");
  });
  test("reads fields", () => {
    const r = parseStopInput(
      JSON.stringify({
        last_assistant_message: lines(40),
        stop_hook_active: true,
        session_id: "abc",
      }),
    );
    expect(r.lineCount).toBe(40);
    expect(r.stopHookActive).toBe(true);
    expect(r.sessionId).toBe("abc");
  });
});

describe("lotraPackage", () => {
  test("pins to the bundled manifest version", async () => {
    const root = join(import.meta.dir, "..");
    const pkg = await Bun.file(join(root, "package.json")).json();
    expect(await lotraPackage()).toBe(`@ryangowe/lotra@${pkg.version}`);
  });
  test("reads the manifest under an explicit root (as CLAUDE_PLUGIN_ROOT would)", async () => {
    const root = join(import.meta.dir, "..");
    const pkg = await Bun.file(join(root, "package.json")).json();
    expect(await lotraPackage(join(root, "plugin"))).toBe(
      `@ryangowe/lotra@${pkg.version}`,
    );
  });
  test("falls back to the unversioned package when no manifest", async () => {
    expect(await lotraPackage("/no/such/dir")).toBe("@ryangowe/lotra");
  });
});

describe("lotraReviewArgs", () => {
  test("defaults to bun x of the pinned package", async () => {
    delete process.env.LOTRA_DEV_ROOT;
    const args = await lotraReviewArgs("/tmp/x.md");
    expect(args.slice(0, 2)).toEqual(["bun", "x"]);
    expect(args.slice(-2)).toEqual(["review", "/tmp/x.md"]);
  });
  test("LOTRA_DEV_ROOT runs the checkout's index.ts", async () => {
    process.env.LOTRA_DEV_ROOT = "/repo";
    try {
      expect(await lotraReviewArgs("/tmp/x.md")).toEqual([
        "bun",
        "/repo/index.ts",
        "review",
        "/tmp/x.md",
      ]);
    } finally {
      delete process.env.LOTRA_DEV_ROOT;
    }
  });
});

describe("stop-gate hook", () => {
  test("does nothing below the gate and writes no dump", async () => {
    const sessionId = "test-gate-below-12345";
    const r = await runHook("stop-gate.ts", {
      last_assistant_message: lines(BELOW_GATE),
      session_id: sessionId,
    });
    expect(r.exitCode).toBe(0);

    const dir = join(tmpdir(), "lotra-review");
    const names = await readdir(dir).catch(() => [] as string[]);
    expect(names.some((n) => n.startsWith(sessionId))).toBe(false);
  });
});
