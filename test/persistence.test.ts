import { test, expect } from "bun:test";
import { DOC, FLUSHED } from "./fixtures.ts";
import { withTmpDoc, post, get } from "./helpers.ts";

test("add/edit/status/delete leave the source file untouched on disk", async () => {
  await using doc = await withTmpDoc(DOC);

  const add = await post(doc.routes, "/api/comment/add", {
    body: { file: doc.file, blockIndex: 1, body: "请改这里" },
  });
  expect(add.status).toBe(200);
  expect(await doc.readDisk()).toBe(DOC);

  const edit = await post(doc.routes, "/api/comment/edit", {
    body: { file: doc.file, id: "c0", body: "改成那样" },
  });
  expect(edit.status).toBe(200);
  expect(await doc.readDisk()).toBe(DOC);

  const status = await post(doc.routes, "/api/comment/status", {
    body: { file: doc.file, id: "c0", status: "note" },
  });
  expect(status.status).toBe(200);
  expect(await doc.readDisk()).toBe(DOC);

  const del = await post(doc.routes, "/api/comment/delete", {
    body: { file: doc.file, id: "c0" },
  });
  expect(del.status).toBe(200);
  expect(await doc.readDisk()).toBe(DOC);
});

test("submit flushes the in-memory copy to disk", async () => {
  await using doc = await withTmpDoc(DOC);

  await post(doc.routes, "/api/comment/add", {
    body: { file: doc.file, blockIndex: 1, body: "请改这里" },
  });
  expect(await doc.readDisk()).toBe(DOC); // untouched before submit

  const res = await post(doc.routes, "/submit", { file: doc.file });
  expect(res.status).toBe(200);
  expect(await doc.readDisk()).toContain(
    '[!comment] id="c0" status="requested"',
  );
});

test("resolve flushes the resolved status to disk", async () => {
  await using doc = await withTmpDoc(DOC);

  await post(doc.routes, "/api/comment/add", {
    body: { file: doc.file, blockIndex: 1, body: "请改这里" },
  });
  const res = await post(doc.routes, "/resolve", {
    file: doc.file,
    body: { ids: ["c0"] },
  });
  expect(res.status).toBe(200);
  expect(await doc.readDisk()).toContain('id="c0" status="resolved"');
});

test("external edits to disk are visible while synced", async () => {
  await using doc = await withTmpDoc(DOC);

  // first load primes the store, mirroring a fresh daemon serving the file
  await get(doc.routes, "/api/document", { file: doc.file });

  await Bun.write(doc.file, DOC.replace("# 关于猫的报告", "# 外部改过的标题"));
  const res = await get(doc.routes, "/api/document", { file: doc.file });
  expect((await res.json()).title).toBe("外部改过的标题");
});

test("submit returns to synced state; later external edits survive the next submit", async () => {
  await using doc = await withTmpDoc(DOC);

  await post(doc.routes, "/api/comment/add", {
    body: { file: doc.file, blockIndex: 1, body: "请改这里" },
  });
  await post(doc.routes, "/submit", { file: doc.file });

  // an external edit after submit must not be clobbered by a stale in-memory copy
  const external = (await doc.readDisk()).replace(
    "# 关于猫的报告",
    "# 外部改过的标题",
  );
  await Bun.write(doc.file, external);
  await post(doc.routes, "/submit", { file: doc.file });
  expect(await doc.readDisk()).toBe(external);
});

test("flush preserves the original prose verbatim (no reflow)", async () => {
  await using doc = await withTmpDoc(DOC);

  await post(doc.routes, "/api/comment/add", {
    body: { file: doc.file, blockIndex: 1, body: "请改这里" },
  });
  await post(doc.routes, "/submit", { file: doc.file });

  expect(await doc.readDisk()).toBe(FLUSHED);
});
