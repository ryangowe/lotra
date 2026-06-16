import { resolve, relative } from "node:path";

/** Resolve filePath under cwd; null if it escapes cwd (path traversal guard). */
export function resolvePath(cwd: string, filePath: string): string | null {
  const abs = resolve(cwd, filePath);
  if (relative(cwd, abs).startsWith("..")) return null;
  return abs;
}
