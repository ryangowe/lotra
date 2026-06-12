import { resolve } from "node:path";
import { Command } from "commander";

export function buildCli(daemonUrl: string): Command {
  const program = new Command()
    .name("lotra")
    .description("Long Text Review and Annotate")
    .argument("[file]", "open file in browser")
    .action((file?: string) => {
      if (!file) return program.help();
      return handleOpen(daemonUrl, file);
    });

  program
    .command("relay <file>")
    .description("wait for user comments, output to stdout")
    .action((file: string) => handleRelay(daemonUrl, file));

  program
    .command("handoff <file>")
    .description("output current comments to stdout")
    .action((file: string) => handleHandoff(daemonUrl, file));

  program
    .command("resolve <file> <ids...>")
    .description("mark comments as resolved")
    .action((file: string, ids: string[]) =>
      handleResolve(daemonUrl, file, ids),
    );

  program
    .command("status")
    .description("show open files")
    .action(() => handleStatus(daemonUrl));

  return program;
}

export async function runCli(daemonUrl: string) {
  await buildCli(daemonUrl).parseAsync();
}

function fileUrl(daemonUrl: string, path: string, absFile: string): string {
  return `${daemonUrl}${path}?file=${encodeURIComponent(absFile)}`;
}

async function handleOpen(daemonUrl: string, file: string) {
  const absFile = resolve(file);
  const res = await fetch(fileUrl(daemonUrl, "/open", absFile), {
    method: "POST",
  });
  if (!res.ok) {
    const data = (await res.json()) as Record<string, any>;
    console.error(`Error: ${data.error}`);
    process.exit(1);
  }
  openBrowser(fileUrl(daemonUrl, "/view", absFile));
}

async function handleRelay(daemonUrl: string, file: string) {
  const absFile = resolve(file);
  const openRes = await fetch(fileUrl(daemonUrl, "/open", absFile), {
    method: "POST",
  });
  if (!openRes.ok) {
    const data = (await openRes.json()) as Record<string, any>;
    console.error(`Error: ${data.error}`);
    process.exit(1);
  }
  openBrowser(fileUrl(daemonUrl, "/view", absFile));

  const res = await fetch(fileUrl(daemonUrl, "/attach", absFile), {
    method: "POST",
  });
  if (!res.ok) {
    const data = (await res.json()) as Record<string, any>;
    console.error(`Error: ${data.error}`);
    process.exit(1);
  }
  const output = await res.text();
  if (output) process.stdout.write(output + "\n");
}

async function handleHandoff(daemonUrl: string, file: string) {
  const absFile = resolve(file);
  const res = await fetch(fileUrl(daemonUrl, "/handoff", absFile));
  if (!res.ok) {
    const data = (await res.json()) as Record<string, any>;
    console.error(`Error: ${data.error}`);
    process.exit(1);
  }
  const output = await res.text();
  if (output) process.stdout.write(output + "\n");
}

async function handleResolve(daemonUrl: string, file: string, ids: string[]) {
  const absFile = resolve(file);
  const res = await fetch(fileUrl(daemonUrl, "/resolve", absFile), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    const data = (await res.json()) as Record<string, any>;
    console.error(`Error: ${data.error}`);
    process.exit(1);
  }
}

async function handleStatus(daemonUrl: string) {
  const res = await fetch(`${daemonUrl}/status`);
  const data = (await res.json()) as {
    files: Array<{ file: string; waiters: number }>;
  };
  if (data.files.length === 0) {
    console.log("No open files.");
    return;
  }
  for (const f of data.files) {
    const waiting = f.waiters > 0 ? ` (${f.waiters} waiting)` : "";
    console.log(`${f.file}${waiting}`);
  }
}

function openBrowser(url: string) {
  const args =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  const proc = Bun.spawn(args, {
    stdin: "ignore",
    stdout: "ignore",
    stderr: "ignore",
  });
  proc.unref();
}
