import { join } from "node:path";

const dir = join(import.meta.dir, "fixtures");

// Anchor indices (comments excluded): 0 h1, 1 para, 2 h2, 3 list item,
// 4 list item, 5 table, 6 code, 7 para. The two list items share one list block
// but keep their own anchors, so /api/document reports 7 blocks for 8 anchors.
export const DOC = await Bun.file(join(dir, "doc.md")).text();

// Golden on-disk markdown after one comment is added to DOC and flushed.
export const FLUSHED = await Bun.file(join(dir, "doc.flushed.md")).text();

// No h1, to exercise the relative-path title fallback.
export const NO_HEADING = await Bun.file(join(dir, "no-heading.md")).text();
