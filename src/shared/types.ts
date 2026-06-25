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

// A list renders as one cohesive list block whose items are individually
// commentable; every other top-level node is a single-anchor node block.
export type BlockData = NodeBlock | ListBlock;

export interface NodeBlock {
  kind: "node";
  index: number;
  html: string;
  heading: { depth: number; text: string } | null;
}

export interface ListBlock {
  kind: "list";
  ordered: boolean;
  // <ol start> when the list doesn't begin at 1; null otherwise and for <ul>.
  start: number | null;
  items: ListItemRef[];
}

export interface ListItemRef {
  // Anchor index a comment's blockIndex points at, not a position in `blocks`.
  index: number;
  // Inner html of the <li>, with comments stripped; tight/loose faithful.
  html: string;
  // Plain-text guide shown above this item's comment cards.
  cite: string;
}

export interface CommentData {
  id: string;
  blockIndex: number | null;
  status: CommentStatus;
  body: string;
  bodyHtml: string;
}
