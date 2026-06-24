import { join } from "node:path";

const dir = join(import.meta.dir, "fixtures");

// Block indices (comments excluded): 0 h1, 1 para, 2 h2, 3 list item, 4 list item,
// 5 table, 6 code, 7 para. Each list item is its own block.
export const DOC = await Bun.file(join(dir, "doc.md")).text();

// Golden on-disk markdown after one comment is added to DOC and flushed.
export const FLUSHED = await Bun.file(join(dir, "doc.flushed.md")).text();

// No h1, to exercise the relative-path title fallback.
export const NO_HEADING = await Bun.file(join(dir, "no-heading.md")).text();
