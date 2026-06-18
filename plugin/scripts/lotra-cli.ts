import { join } from "node:path";

// Plugin root: CLAUDE_PLUGIN_ROOT is exported to hook processes. The relative fallback
// (this file lives in <root>/scripts) covers direct runs and tests, where it is unset.
function pluginRoot(): string {
  return process.env.CLAUDE_PLUGIN_ROOT ?? join(import.meta.dir, "..");
}

// `lotra@<version>` pinned to the bundled manifest so the hook and the published CLI
// never drift; bare `lotra` if the manifest is missing or unreadable.
export async function lotraPackage(root = pluginRoot()): Promise<string> {
  try {
    const manifest = await Bun.file(
      join(root, ".claude-plugin/plugin.json"),
    ).json();
    return manifest.version ? `lotra@${manifest.version}` : "lotra";
  } catch {
    return "lotra";
  }
}
