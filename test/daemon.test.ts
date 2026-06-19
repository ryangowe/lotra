import {
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "bun:test";
import { mkdtemp, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let testDir: string;
let portFile: string;
let testPort: number;
const tmpFiles: string[] = [];

beforeAll(async () => {
  testDir = await mkdtemp(join(tmpdir(), "lotra-daemon-test-"));
  portFile = join(testDir, "port");
  testPort = 17300 + Math.floor(Math.random() * 600);
});

afterAll(async () => {
  await shutdownDaemon();
  await rm(testDir, { recursive: true, force: true });
});

function daemonEnv() {
  return { LOTRA_PORT_DIR: testDir, LOTRA_PORT: String(testPort) };
}

async function waitForDaemon(
  timeoutMs = 5000,
): Promise<{ port: string; url: string }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const file = Bun.file(portFile);
    if (await file.exists()) {
      const port = (await file.text()).trim();
      try {
        const res = await fetch(`http://127.0.0.1:${port}/status`, {
          signal: AbortSignal.timeout(500),
        });
        if (res.ok) return { port, url: `http://127.0.0.1:${port}` };
      } catch {}
    }
    await Bun.sleep(100);
  }
  throw new Error("daemon did not start");
}

async function shutdownDaemon() {
  const file = Bun.file(portFile);
  if (!(await file.exists())) return;
  const port = (await file.text()).trim();
  try {
    await fetch(`http://127.0.0.1:${port}/shutdown`, {
      method: "POST",
      signal: AbortSignal.timeout(2000),
    });
  } catch {}
  for (let i = 0; i < 30; i++) {
    await Bun.sleep(100);
    if (!(await Bun.file(portFile).exists())) return;
  }
}

function spawnDaemon() {
  return Bun.spawn(
    [
      "bun",
      "-e",
      `
      import { ensureDaemon } from './src/server/daemon.ts';
      await ensureDaemon();
      `,
    ],
    {
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...daemonEnv() },
    },
  );
}

function tmpFile(): string {
  const path = join(testDir, `doc-${Date.now()}.md`);
  tmpFiles.push(path);
  return path;
}

beforeEach(async () => {
  await shutdownDaemon();
});

afterEach(async () => {
  await shutdownDaemon();
  for (const f of tmpFiles.splice(0)) {
    try {
      await unlink(f);
    } catch {}
  }
});

test("detached daemon survives parent process exit", async () => {
  const spawner = spawnDaemon();
  await spawner.exited;
  expect(spawner.exitCode).toBe(0);

  await Bun.sleep(500);

  const { url } = await waitForDaemon();
  const res = await fetch(`${url}/status`);
  expect(res.ok).toBe(true);
});

test("daemon serves HTML and CSS after spawner exits", async () => {
  const file = tmpFile();
  await Bun.write(file, "# Daemon test\n\nContent.");

  const encodedFile = encodeURIComponent(file);
  const spawner = Bun.spawn(
    [
      "bun",
      "-e",
      `
      import { ensureDaemon } from './src/server/daemon.ts';
      const url = await ensureDaemon();
      await fetch(url + '/open?file=${encodedFile}', { method: 'POST' });
      `,
    ],
    {
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...daemonEnv() },
    },
  );
  await spawner.exited;
  await Bun.sleep(500);

  const { url } = await waitForDaemon();

  const html = await fetch(`${url}/view?file=${encodeURIComponent(file)}`);
  expect(html.status).toBe(200);

  const body = await html.text();
  const cssPath = body.match(/href="(\/[^"]*\.css)"/)?.[1];
  expect(cssPath).toBeTruthy();

  const css = await fetch(`${url}${cssPath}`);
  expect(css.status).toBe(200);
  expect(Number(css.headers.get("content-length"))).toBeGreaterThan(0);
});

test("SIGTERM cleans up port file", async () => {
  const spawner = spawnDaemon();
  await spawner.exited;
  await Bun.sleep(500);

  const { url } = await waitForDaemon();
  expect(await Bun.file(portFile).exists()).toBe(true);

  const status = (await (await fetch(`${url}/status`)).json()) as {
    pid: number;
  };
  process.kill(status.pid, "SIGTERM");

  for (let i = 0; i < 30; i++) {
    await Bun.sleep(100);
    if (!(await Bun.file(portFile).exists())) break;
  }
  expect(await Bun.file(portFile).exists()).toBe(false);
});

test("shutdown flushes files and cleans up port file", async () => {
  const spawner = spawnDaemon();
  await spawner.exited;
  await Bun.sleep(500);

  const { url } = await waitForDaemon();
  expect(await Bun.file(portFile).exists()).toBe(true);

  const res = await fetch(`${url}/shutdown`, { method: "POST" });
  expect(res.status).toBe(200);

  for (let i = 0; i < 30; i++) {
    await Bun.sleep(100);
    if (!(await Bun.file(portFile).exists())) break;
  }
  expect(await Bun.file(portFile).exists()).toBe(false);
});
