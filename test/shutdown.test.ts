import { test, expect } from "bun:test";
import { DOC } from "./fixtures.ts";
import { withTmpDoc, post } from "./helpers.ts";

test("shutdown flushes dirty files before responding", async () => {
  await using doc = await withTmpDoc(DOC);

  await post(doc.routes, "/api/comment/add", {
    body: { file: doc.file, blockIndex: 1, body: "请改这里" },
  });
  expect(await doc.readDisk()).toBe(DOC);

  const res = await post(doc.routes, "/shutdown");
  expect(res.status).toBe(200);
  expect(await doc.readDisk()).toContain(
    '[!comment] id="c0" status="requested"',
  );
});

test("shutdown with no dirty files responds ok", async () => {
  await using doc = await withTmpDoc(DOC);
  await post(doc.routes, "/open", { file: doc.file });

  const res = await post(doc.routes, "/shutdown");
  expect(res.status).toBe(200);
  expect(await doc.readDisk()).toBe(DOC);
});
