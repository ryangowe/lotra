import { resolve } from "node:path";
import { PORT_FILE } from "../shared/constants.ts";

export async function getDaemonUrl(): Promise<string | null> {
  const file = Bun.file(PORT_FILE);
  if (!(await file.exists())) return null;

  try {
    const port = (await file.text()).trim();
    const url = `http://127.0.0.1:${port}`;
    const res = await fetch(`${url}/status`, {
      signal: AbortSignal.timeout(1000),
    });
    if (res.ok) return url;
    return null;
  } catch {
    return null;
  }
}

export async function ensureDaemon(): Promise<string> {
  const existing = await getDaemonUrl();
  if (existing) return existing;

  // Run from the package root so Bun's bundler finds bunfig.toml (the tailwind plugin).
  const entryPoint = resolve(import.meta.dir, "server.ts");
  const packageRoot = resolve(import.meta.dir, "../..");
  const proc = Bun.spawn(["bun", entryPoint], {
    cwd: packageRoot,
    stdin: "ignore",
    stdout: "ignore",
    stderr: "ignore",
  });
  proc.unref();

  for (let i = 0; i < 50; i++) {
    await Bun.sleep(100);
    const url = await getDaemonUrl();
    if (url) return url;
  }

  throw new Error("Failed to start lotra daemon");
}
