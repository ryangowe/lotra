import { join } from "node:path";

// Plugin root: CLAUDE_PLUGIN_ROOT is exported to hook processes. The relative fallback
// (this file lives in <root>/scripts) covers direct runs and tests, where it is unset.
function pluginRoot(): string {
  return process.env.CLAUDE_PLUGIN_ROOT ?? join(import.meta.dir, "..");
}

// `@ryangowe/lotra@<version>` pinned to the bundled manifest so the hook and the
// published CLI never drift; unversioned if the manifest is missing or unreadable.
export async function lotraPackage(root = pluginRoot()): Promise<string> {
  try {
    const manifest = await Bun.file(
      join(root, ".claude-plugin/plugin.json"),
    ).json();
    return manifest.version
      ? `@ryangowe/lotra@${manifest.version}`
      : "@ryangowe/lotra";
  } catch {
    return "@ryangowe/lotra";
  }
}

// Argv to run a lotra review. Defaults to the published package pinned to the bundled
// manifest version. LOTRA_DEV_ROOT overrides it with a checkout's `index.ts`, so the
// plugin can be exercised against unpublished working-tree source.
export async function lotraReviewArgs(file: string): Promise<string[]> {
  const devRoot = process.env.LOTRA_DEV_ROOT;
  if (devRoot) return ["bun", join(devRoot, "index.ts"), "review", file];
  return ["bun", "x", await lotraPackage(), "review", file];
}
