import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../src/server/store.ts";
import {
  createRoutes,
  type RouteTable,
  type ServerContext,
} from "../src/server/routes.ts";

// genId yields c0, c1, … so returned ids and callout contents are stable to assert.
export function makeCtx(): ServerContext {
  let n = 0;
  const store = createStore({
    readMd: (p) => Bun.file(p).text(),
    writeMd: (p, c) => Bun.write(p, c).then(() => {}),
  });
  return {
    ...store,
    genId: () => "c" + n++,
    fileExists: (p) => Bun.file(p).exists(),
  };
}

export interface TmpDoc extends AsyncDisposable {
  cwd: string;
  file: string;
  ctx: ServerContext;
  routes: RouteTable;
  readDisk(): Promise<string>;
}

// `await using doc = await withTmpDoc(DOC)` — temp dir is removed when the scope exits.
export async function withTmpDoc(content: string): Promise<TmpDoc> {
  const cwd = await mkdtemp(join(tmpdir(), "lotra-test-"));
  const file = join(cwd, "doc.md");
  await Bun.write(file, content);
  const ctx = makeCtx();
  return {
    cwd,
    file,
    ctx,
    routes: createRoutes(ctx),
    readDisk: () => Bun.file(file).text(),
    async [Symbol.asyncDispose]() {
      await rm(cwd, { recursive: true, force: true });
    },
  };
}

export function post(
  routes: RouteTable,
  path: string,
  opts: { file?: string; body?: unknown } = {},
): Promise<Response> {
  const qs = opts.file ? `?file=${encodeURIComponent(opts.file)}` : "";
  const init: RequestInit = { method: "POST" };
  if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body);
    init.headers = { "Content-Type": "application/json" };
  }
  return routes[path]!.POST!(new Request(`http://t${path}${qs}`, init));
}

export function get(
  routes: RouteTable,
  path: string,
  query: Record<string, string> = {},
): Promise<Response> {
  const qs = Object.keys(query).length
    ? "?" + new URLSearchParams(query).toString()
    : "";
  return routes[path]!.GET!(new Request(`http://t${path}${qs}`));
}

// Env for spawning hook scripts so their lotra review runs the working-tree CLI
// (LOTRA_DEV_ROOT) instead of `bun x` the published package.
export function hookEnv(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    ...process.env,
    LOTRA_DEV_ROOT: join(import.meta.dir, ".."),
    ...extra,
  };
}
