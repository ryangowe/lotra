import { resolve } from "node:path";

// Single source for agent instructions; bundled in the npm tarball (package.json `files`).
const SKILL_PATH = resolve(
  import.meta.dir,
  "../../plugin/skills/lotra/SKILL.md",
);

export function stripFrontmatter(md: string): string {
  const m = md.match(/^---\n[\s\S]*?\n---\n/);
  return (m ? md.slice(m[0].length) : md).trimStart();
}

// The bundled skill body (frontmatter stripped) that `lotra prompt` emits.
export async function readPrompt(): Promise<string> {
  const file = Bun.file(SKILL_PATH);
  if (!(await file.exists())) {
    throw new Error(`prompt source not found: ${SKILL_PATH}`);
  }
  const body = stripFrontmatter(await file.text());
  return body.endsWith("\n") ? body : body + "\n";
}
