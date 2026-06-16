import { test, expect } from "bun:test";
import { DOC } from "./fixtures.ts";
import { withTmpDoc, post, type TmpDoc } from "./helpers.ts";

const EXPECTED =
  '<cite>猫是一种常见的家养动物,行踪难以预测。</cite>\n<comment id="c0">请改这里</comment>';

async function seedComment(doc: TmpDoc) {
  await post(doc.routes, "/api/comment/add", {
    body: { file: doc.file, blockIndex: 1, body: "请改这里" },
  });
}

test("an attached waiter is notified with the requested comments on submit", async () => {
  await using doc = await withTmpDoc(DOC);
  await seedComment(doc);

  const waiting = post(doc.routes, "/attach", { file: doc.file }); // pending until submit

  const submit = await post(doc.routes, "/submit", { file: doc.file });
  expect(await submit.json()).toEqual({ ok: true, notified: 1 });

  expect(await (await waiting).text()).toBe(EXPECTED);
});

test("all concurrent waiters receive the same output from one submit", async () => {
  await using doc = await withTmpDoc(DOC);
  await seedComment(doc);

  const a = post(doc.routes, "/attach", { file: doc.file });
  const b = post(doc.routes, "/attach", { file: doc.file });

  const submit = await post(doc.routes, "/submit", { file: doc.file });
  expect(await submit.json()).toEqual({ ok: true, notified: 2 });

  expect(await (await a).text()).toBe(EXPECTED);
  expect(await (await b).text()).toBe(EXPECTED);
});
