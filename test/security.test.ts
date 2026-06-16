import { test, expect } from "bun:test";
import { join } from "node:path";
import { resolvePath } from "../src/server/paths.ts";
import { DOC } from "./fixtures.ts";
import { withTmpDoc, get } from "./helpers.ts";

const cwd = "/home/user/project";

const cases: Array<[string, string | null]> = [
  ["../../etc/passwd", null],
  ["../sibling.md", null],
  ["/etc/passwd", null],
  ["doc.md", join(cwd, "doc.md")],
  ["sub/nested.md", join(cwd, "sub/nested.md")],
  [join(cwd, "inside.md"), join(cwd, "inside.md")],
];

test.each(cases)(
  "resolvePath rejects escapes, resolves children: %p",
  (input, expected) => {
    expect(resolvePath(cwd, input)).toBe(expected);
  },
);

test("a traversal path on /api/document is rejected with 400", async () => {
  await using doc = await withTmpDoc(DOC);
  const res = await get(doc.routes, "/api/document", {
    file: "../../../etc/passwd",
  });
  expect(res.status).toBe(400);
});
