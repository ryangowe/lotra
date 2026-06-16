export const COMMENT_STATUSES = ["requested", "note", "resolved"] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export interface Comment {
  id: string;
  status: CommentStatus;
  body: string;
  paragraphText: string;
}
