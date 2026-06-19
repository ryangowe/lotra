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
import { buildPage } from "./buildPage.ts";

export async function startServer() {
  const store = createStore({
    readMd: (p: string) => Bun.file(p).text(),
    writeMd: (p: string, c: string) => Bun.write(p, c).then(() => {}),
  });

  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let server: ReturnType<typeof Bun.serve>;

  async function shutdown({ exit = false } = {}) {
    if (idleTimer) clearTimeout(idleTimer);
    await store.flushAll();
    store.drainWaiters();
    try {
      unlinkSync(PORT_FILE);
    } catch {}
    if (exit) {
      server?.stop(true);
      process.exit(0);
    } else {
      server?.stop();
    }
  }

  function resetIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => shutdown({ exit: true }), IDLE_TIMEOUT_MS);
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

  const raw = createRoutes({
    ...store,
    genId: () => "c" + crypto.randomUUID().slice(0, 7),
    fileExists: (p: string) => Bun.file(p).exists(),
    onShutdown: () => shutdown(),
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

  const isDev = process.env.NODE_ENV === "development";

  // HTML import emits /../../ asset paths; prod pre-builds with explicit root to fix them
  let viewRoutes: Record<string, unknown>;
  if (isDev) {
    viewRoutes = { "/view": page };
  } else {
    const { html, assets } = await buildPage();
    viewRoutes = {
      "/view": new Response(html, {
        headers: { "Content-Type": "text/html;charset=utf-8" },
      }),
      ...assets,
    };
  }

  const serveConfig = {
    hostname: "127.0.0.1",
    idleTimeout: 0,
    routes: {
      ...viewRoutes,
      "/favicon.ico": new Response(null, { status: 204 }),
      ...routes,
    },
    development: isDev ? { hmr: true, console: true } : false,
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

  process.on("SIGHUP", () => {});
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => shutdown({ exit: true }));
  }
  // Fallback for uncaught exceptions — shutdown() handles normal exits
  process.on("exit", () => {
    try {
      unlinkSync(PORT_FILE);
    } catch {}
  });

  return server;
}

if (import.meta.main) {
  await startServer();
}
