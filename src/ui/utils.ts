import type { CommentData, CommentStatus } from "../shared/types.ts";

export function stripMd(s: string): string {
  return (s || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function snippet(s: string, max = 58): string {
  const plain = stripMd(s);
  return plain.length > max ? plain.slice(0, max).trim() + "…" : plain;
}

export const STATUS_LABELS: Record<CommentStatus, string> = {
  requested: "Change Requested",
  note: "Note",
  resolved: "Resolved",
};

// tailwind background utility per status, for dots and pills
export const STATUS_DOT: Record<CommentStatus, string> = {
  requested: "bg-accent",
  note: "bg-note",
  resolved: "bg-done",
};

// background tint of a commented block/item, by its most urgent comment status
export const STATUS_TINT: Record<CommentStatus, string> = {
  requested: "bg-hi-req",
  note: "bg-hi-note",
  resolved: "bg-hi-done",
};

const STATUS_RANK: Record<CommentStatus, number> = {
  requested: 3,
  note: 2,
  resolved: 1,
};

// The most urgent status among a block's comments: requested > note > resolved.
export function topCommentStatus(
  comments: CommentData[],
): CommentStatus | null {
  let top: CommentStatus | null = null;
  for (const c of comments)
    if (!top || STATUS_RANK[c.status] > STATUS_RANK[top]) top = c.status;
  return top;
}
