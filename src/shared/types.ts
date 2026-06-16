export const COMMENT_STATUSES = ["requested", "note", "resolved"] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export interface Comment {
  id: string;
  status: CommentStatus;
  body: string;
  paragraphText: string;
}

export interface DocumentData {
  title: string;
  blocks: BlockData[];
  comments: CommentData[];
}

export interface BlockData {
  index: number;
  html: string;
}

export interface CommentData {
  id: string;
  blockIndex: number | null;
  status: CommentStatus;
  body: string;
  bodyHtml: string;
}
