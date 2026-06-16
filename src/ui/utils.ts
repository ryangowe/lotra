import type { CommentStatus } from "../shared/types.ts";

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
