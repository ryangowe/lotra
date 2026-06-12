import { relative } from "node:path";
import { COMMENT_STATUSES } from "./types.ts";
import {
  extractComments,
  insertComment,
  editCommentBody,
  updateCommentStatus,
  removeComment,
  formatCommentsForStdout,
} from "./comments.ts";
import { sanitize } from "./sanitize.ts";
import { renderView } from "./render.ts";

export interface ServerContext {
  cwd: string;
  resolvePath(p: string): string | null;
  getFile(p: string): FileState;
  peekFile(p: string): FileState | undefined;
  allFiles(): IterableIterator<[string, FileState]>;
  genId(): string;
  fileExists(p: string): Promise<boolean>;
  readMd(p: string): Promise<string>;
  writeMd(p: string, content: string): Promise<void>;
}

export interface FileState {
  waiters: Array<(output: string) => void>;
}

type Handler = (req: Request) => Promise<Response>;
export type RouteTable = Record<string, Record<string, Handler>>;

function fileParam(req: Request, ctx: ServerContext): string | null {
  const f = new URL(req.url).searchParams.get("file");
  if (!f) return null;
  return ctx.resolvePath(f);
}

export function createRoutes(ctx: ServerContext): RouteTable {
  return {
    "/open": {
      POST: async (req) => {
        const absPath = fileParam(req, ctx);
        if (!absPath)
          return Response.json({ error: "invalid file path" }, { status: 400 });
        if (!(await ctx.fileExists(absPath)))
          return Response.json({ error: "file not found" }, { status: 404 });
        ctx.getFile(absPath);
        return Response.json({ ok: true, file: absPath });
      },
    },

    "/attach": {
      POST: async (req) => {
        const absPath = fileParam(req, ctx);
        if (!absPath)
          return Response.json({ error: "invalid file path" }, { status: 400 });
        const file = ctx.getFile(absPath);
        const output = await new Promise<string>((r) => file.waiters.push(r));
        return new Response(output, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },

    "/submit": {
      POST: async (req) => {
        const absPath = fileParam(req, ctx);
        if (!absPath)
          return Response.json({ error: "invalid file path" }, { status: 400 });
        const file = ctx.getFile(absPath);

        const md = await ctx.readMd(absPath);
        const output = formatCommentsForStdout(extractComments(md));

        const waiters = file.waiters.splice(0);
        for (const w of waiters) w(output);

        return Response.json({ ok: true, notified: waiters.length });
      },
    },

    "/handoff": {
      GET: async (req) => {
        const absPath = fileParam(req, ctx);
        if (!absPath)
          return Response.json({ error: "invalid file path" }, { status: 400 });

        const md = await ctx.readMd(absPath);
        const output = formatCommentsForStdout(extractComments(md));
        return new Response(output, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },

    "/resolve": {
      POST: async (req) => {
        const absPath = fileParam(req, ctx);
        if (!absPath)
          return Response.json({ error: "invalid file path" }, { status: 400 });

        const { ids } = (await req.json()) as Record<string, any>;
        if (!Array.isArray(ids))
          return Response.json(
            { error: "ids must be an array" },
            { status: 400 },
          );

        const md = await ctx.readMd(absPath);
        await ctx.writeMd(absPath, updateCommentStatus(md, ids, "resolved"));
        return Response.json({ ok: true });
      },
    },

    "/status": {
      GET: async (req) => {
        const fileQuery = new URL(req.url).searchParams.get("file");
        if (fileQuery) {
          const absPath = ctx.resolvePath(fileQuery);
          if (!absPath)
            return Response.json(
              { error: "invalid file path" },
              { status: 400 },
            );
          const file = ctx.peekFile(absPath);
          return Response.json({
            file: absPath,
            registered: !!file,
            waiters: file?.waiters.length ?? 0,
          });
        }
        const status = [...ctx.allFiles()].map(([p, s]) => ({
          file: p,
          waiters: s.waiters.length,
        }));
        return Response.json({ files: status });
      },
    },

    "/view": {
      GET: async (req) => {
        const absPath = fileParam(req, ctx);
        if (!absPath) return new Response("Invalid file path", { status: 400 });
        if (!(await ctx.fileExists(absPath)))
          return new Response("File not found", { status: 404 });

        ctx.getFile(absPath);
        const md = await ctx.readMd(absPath);
        const html = renderView(relative(ctx.cwd, absPath), md);
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      },
    },

    "/api/comment/add": {
      POST: async (req) => {
        const {
          file: filePath,
          blockIndex,
          body,
          status = "requested",
        } = (await req.json()) as Record<string, any>;
        const absPath = ctx.resolvePath(filePath);
        if (!absPath)
          return Response.json({ error: "invalid file path" }, { status: 400 });

        const validation = sanitize(body);
        if (!validation.valid)
          return Response.json(
            { error: "invalid content", errors: validation.errors },
            { status: 400 },
          );

        const id = ctx.genId();
        const md = await ctx.readMd(absPath);
        await ctx.writeMd(
          absPath,
          insertComment(md, blockIndex, id, status, body),
        );
        return Response.json({ ok: true, id });
      },
    },

    "/api/comment/edit": {
      POST: async (req) => {
        const {
          file: filePath,
          id,
          body,
        } = (await req.json()) as Record<string, any>;
        const absPath = ctx.resolvePath(filePath);
        if (!absPath)
          return Response.json({ error: "invalid file path" }, { status: 400 });

        const validation = sanitize(body);
        if (!validation.valid)
          return Response.json(
            { error: "invalid content", errors: validation.errors },
            { status: 400 },
          );

        const md = await ctx.readMd(absPath);
        await ctx.writeMd(absPath, editCommentBody(md, id, body));
        return Response.json({ ok: true });
      },
    },

    "/api/comment/delete": {
      POST: async (req) => {
        const { file: filePath, id } = (await req.json()) as Record<
          string,
          any
        >;
        const absPath = ctx.resolvePath(filePath);
        if (!absPath)
          return Response.json({ error: "invalid file path" }, { status: 400 });

        const md = await ctx.readMd(absPath);
        await ctx.writeMd(absPath, removeComment(md, id));
        return Response.json({ ok: true });
      },
    },

    "/api/comment/status": {
      POST: async (req) => {
        const {
          file: filePath,
          id,
          status,
        } = (await req.json()) as Record<string, any>;
        const absPath = ctx.resolvePath(filePath);
        if (!absPath)
          return Response.json({ error: "invalid file path" }, { status: 400 });
        if (!(COMMENT_STATUSES as readonly string[]).includes(status))
          return Response.json({ error: "invalid status" }, { status: 400 });

        const md = await ctx.readMd(absPath);
        await ctx.writeMd(absPath, updateCommentStatus(md, [id], status));
        return Response.json({ ok: true });
      },
    },
  };
}
