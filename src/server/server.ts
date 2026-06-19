import { unlinkSync } from "node:fs";
import {
  PORT_DIR,
  PORT_FILE,
  DEFAULT_PORT,
  IDLE_TIMEOUT_MS,
} from "../shared/constants.ts";
import { createRoutes } from "./routes.ts";
import { createStore } from "./store.ts";
import page from "../ui/page.html";

export async function startServer() {
  const store = createStore({
    readMd: (p: string) => Bun.file(p).text(),
    writeMd: (p: string, c: string) => Bun.write(p, c).then(() => {}),
  });

  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  function resetIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => process.exit(0), IDLE_TIMEOUT_MS);
  }

  function wrap(handler: (req: Request) => Promise<Response>) {
    return async (req: Request) => {
      resetIdle();
      try {
        return await handler(req);
      } catch (e) {
        console.error(e);
        return Response.json({ error: String(e) }, { status: 500 });
      }
    };
  }

  let server: ReturnType<typeof Bun.serve>;

  const raw = createRoutes({
    ...store,
    genId: () => "c" + crypto.randomUUID().slice(0, 7),
    fileExists: (p: string) => Bun.file(p).exists(),
    onShutdown: () => {
      server.stop(true);
      process.exit(0);
    },
  });

  const routes: Record<
    string,
    Record<string, (req: Request) => Promise<Response>>
  > = {};
  for (const [path, methods] of Object.entries(raw)) {
    routes[path] = {};
    for (const [method, handler] of Object.entries(methods)) {
      routes[path][method] = wrap(handler);
    }
  }

  await Bun.$`mkdir -p ${PORT_DIR}`.quiet();

  const serveConfig = {
    hostname: "127.0.0.1",
    routes: {
      "/view": page,
      "/favicon.ico": new Response(null, { status: 204 }),
      ...routes,
    },
    development:
      process.env.NODE_ENV === "development"
        ? { hmr: true, console: true }
        : false,
    fetch() {
      resetIdle();
      return new Response("Not found", { status: 404 });
    },
  };

  try {
    server = Bun.serve({ ...serveConfig, port: DEFAULT_PORT });
  } catch {
    server = Bun.serve({ ...serveConfig, port: 0 });
  }

  await Bun.write(PORT_FILE, String(server.port));
  resetIdle();

  function cleanup() {
    try {
      unlinkSync(PORT_FILE);
    } catch {}
  }
  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });
  process.on("exit", cleanup);

  return server;
}

if (import.meta.main) {
  await startServer();
}
