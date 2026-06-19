#!/usr/bin/env bun
import { join } from "node:path";

const level = process.argv[2] as "major" | "minor" | "patch";
if (!["major", "minor", "patch"].includes(level)) {
  console.error("Usage: bun scripts/bump-version.ts <major|minor|patch>");
  process.exit(1);
}

const root = join(import.meta.dir, "..");
const pkgPath = join(root, "package.json");
const pkg = await Bun.file(pkgPath).json();

const [major, minor, patch] = pkg.version.split(".").map(Number);
const next =
  level === "major"
    ? `${major + 1}.0.0`
    : level === "minor"
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;

pkg.version = next;
await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// Mirror into plugin manifest.
const manifestPath = join(root, "plugin/.claude-plugin/plugin.json");
const manifest = await Bun.file(manifestPath).json();
manifest.version = next;
await Bun.write(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(`${pkg.version.replace(next, "")}${next}`);
