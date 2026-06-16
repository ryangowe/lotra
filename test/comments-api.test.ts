import { test, expect } from "bun:test";
import { join } from "node:path";
import { DOC, NO_HEADING } from "./fixtures.ts";
import { withTmpDoc, post, get, type TmpDoc } from "./helpers.ts";

async function commentsOf(doc: TmpDoc) {
  const res = await get(doc.routes, "/api/document", { file: doc.file });
  return (await res.json()).comments;
}

test("a comment's full lifecycle is reflected in /api/document", async () => {
  await using doc = await withTmpDoc(DOC);

  const add = await post(doc.routes, "/api/comment/add", {
    body: { file: doc.file, blockIndex: 1, body: "请改这里" },
  });
  expect(await add.json()).toEqual({ ok: true, id: "c0" });
  expect(await commentsOf(doc)).toEqual([
    {
      id: "c0",
      blockIndex: 1,
      status: "requested",
      body: "请改这里",
      bodyHtml: "<p>请改这里</p>",
    },
  ]);

  await post(doc.routes, "/api/comment/edit", {
    body: { file: doc.file, id: "c0", body: "改成那样" },
  });
  expect((await commentsOf(doc))[0].body).toBe("改成那样");

  await post(doc.routes, "/api/comment/status", {
    body: { file: doc.file, id: "c0", status: "note" },
  });
  expect((await commentsOf(doc))[0].status).toBe("note");

  await post(doc.routes, "/api/comment/delete", {
    body: { file: doc.file, id: "c0" },
  });
  expect(await commentsOf(doc)).toEqual([]);
});

test("a second comment on the same block is rejected with 409", async () => {
  await using doc = await withTmpDoc(DOC);

  const first = await post(doc.routes, "/api/comment/add", {
    body: { file: doc.file, blockIndex: 1, body: "第一条" },
  });
  expect(first.status).toBe(200);

  const second = await post(doc.routes, "/api/comment/add", {
    body: { file: doc.file, blockIndex: 1, body: "第二条" },
  });
  expect(second.status).toBe(409);
  expect((await commentsOf(doc)).length).toBe(1);
});

test("disallowed comment markdown is rejected with 400", async () => {
  await using doc = await withTmpDoc(DOC);

  const res = await post(doc.routes, "/api/comment/add", {
    body: { file: doc.file, blockIndex: 1, body: "# 不允许的标题" },
  });
  expect(res.status).toBe(400);
  expect((await commentsOf(doc)).length).toBe(0);
});

test("an unknown status value is rejected with 400", async () => {
  await using doc = await withTmpDoc(DOC);

  await post(doc.routes, "/api/comment/add", {
    body: { file: doc.file, blockIndex: 1, body: "请改这里" },
  });
  const res = await post(doc.routes, "/api/comment/status", {
    body: { file: doc.file, id: "c0", status: "bogus" },
  });
  expect(res.status).toBe(400);
  expect((await commentsOf(doc))[0].status).toBe("requested");
});

test("/api/document returns h1 title, indexed blocks, and anchored comments", async () => {
  await using doc = await withTmpDoc(DOC);

  await post(doc.routes, "/api/comment/add", {
    body: { file: doc.file, blockIndex: 1, body: "请改这里" },
  });
  const res = await get(doc.routes, "/api/document", { file: doc.file });
  const data = await res.json();

  expect(data.title).toBe("关于猫的报告");
  expect(data.blocks.length).toBe(7);
  expect(data.blocks[0].heading).toEqual({ depth: 1, text: "关于猫的报告" });
  expect(data.comments[0].blockIndex).toBe(1);
});

test("title falls back to the relative path when there is no h1", async () => {
  await using doc = await withTmpDoc(NO_HEADING);
  const res = await get(doc.routes, "/api/document", { file: doc.file });
  expect((await res.json()).title).toBe("doc.md");
});

test("a missing file yields 404", async () => {
  await using doc = await withTmpDoc(DOC);
  const res = await get(doc.routes, "/api/document", {
    file: join(doc.cwd, "missing.md"),
  });
  expect(res.status).toBe(404);
});
