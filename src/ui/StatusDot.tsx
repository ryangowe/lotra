import type { CommentStatus } from "../shared/types.ts";
import { STATUS_DOT } from "./utils.ts";

export function StatusDot({
  status,
  className = "",
}: {
  status: CommentStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${STATUS_DOT[status]} ${className}`}
    />
  );
}
