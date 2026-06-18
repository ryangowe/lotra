#!/usr/bin/env bun
// package.json is the single source of truth for the version; mirror it into the plugin manifest.
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const pkg = await Bun.file(join(root, "package.json")).json();
const manifestPath = join(root, "plugin/.claude-plugin/plugin.json");
const manifest = await Bun.file(manifestPath).json();

manifest.version = pkg.version;
await Bun.write(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
