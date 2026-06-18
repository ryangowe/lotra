import { test, expect } from "bun:test";
import { join } from "node:path";

// The plugin manifest version is mirrored from package.json by scripts/sync-version.ts.
test("plugin manifest version matches package version", async () => {
  const root = join(import.meta.dir, "..");
  const pkg = await Bun.file(join(root, "package.json")).json();
  const manifest = await Bun.file(
    join(root, "plugin/.claude-plugin/plugin.json"),
  ).json();
  expect(manifest.version).toBe(pkg.version);
});
