import { test, expect } from "bun:test";
import { createStore } from "./store.ts";

function fakeIo(initial: Record<string, string>) {
  const disk: Record<string, string> = { ...initial };
  const writes: string[] = [];
  return {
    disk,
    writes,
    io: {
      readMd: async (p: string) => disk[p] ?? "",
      writeMd: async (p: string, c: string) => {
        disk[p] = c;
        writes.push(p);
      },
    },
  };
}

test("edits stay in memory until flush", async () => {
  const { disk, writes, io } = fakeIo({ "/a.md": "hello" });
  const store = createStore(io);

  await store.load("/a.md");
  store.setText("/a.md", "edited");
  expect(disk["/a.md"]).toBe("hello");
  expect(writes.length).toBe(0);

  await store.flush("/a.md");
  expect(disk["/a.md"]).toBe("edited");
});

test("load reads disk once, then serves the in-memory copy", async () => {
  const { disk, io } = fakeIo({ "/a.md": "v1" });
  const store = createStore(io);

  expect(await store.load("/a.md")).toBe("v1");
  disk["/a.md"] = "v2-external";
  expect(await store.load("/a.md")).toBe("v1");
});

test("flush is a no-op for a file that was never loaded", async () => {
  const { writes, io } = fakeIo({ "/a.md": "hello" });
  const store = createStore(io);

  await store.flush("/a.md");
  expect(writes.length).toBe(0);
});
