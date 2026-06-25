import { useState } from "react";
import { CornerDownRight } from "lucide-react";
import type { ListBlock, CommentData, CommentStatus } from "../shared/types.ts";
import { CommentCard } from "./CommentCard.tsx";
import { AddCommentButton } from "./AddCommentButton.tsx";
import { snippet, STATUS_TINT, topCommentStatus } from "./utils.ts";

// A cohesive <ol>/<ul> whose items are individually commentable. The list and
// every <li> are real React elements, so tint, ring, and the per-item "+" are
// declarative props — correct on first paint, with no effect reaching into the
// DOM. Comment cards stack below the whole list, each labelled with the item it
// annotates; hovering a card rings its item.
export function ListBlockView({
  block,
  comments,
  focusEditId,
  onPlusClick,
  onStatusChange,
  onEdit,
  onDelete,
  onCancelCompose,
}: {
  block: ListBlock;
  comments: CommentData[];
  focusEditId: string | null;
  onPlusClick: (index: number) => void;
  onStatusChange: (id: string, s: CommentStatus) => void;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  onCancelCompose: () => void;
}) {
  const [highlight, setHighlight] = useState<number | null>(null);
  const Tag = block.ordered ? "ol" : "ul";
  const commentsFor = (index: number) =>
    comments.filter((c) => c.blockIndex === index);
  const commented = block.items.filter(
    (it) => commentsFor(it.index).length > 0,
  );

  return (
    <div className="mt-3 first:mt-0">
      <div className="md prose prose-lg max-w-none px-2.5 py-1.5 font-serif">
        <Tag start={block.start ?? undefined}>
          {block.items.map((it) => {
            const status = topCommentStatus(commentsFor(it.index));
            return (
              <li
                key={it.index}
                data-block-index={it.index}
                className={`group/item relative rounded-md transition-colors ${
                  status ? STATUS_TINT[status] : ""
                } ${highlight === it.index ? "ring-2 ring-accent" : ""}`}
              >
                <div
                  className="[display:contents]"
                  dangerouslySetInnerHTML={{ __html: it.html }}
                />
                <AddCommentButton
                  onClick={() => onPlusClick(it.index)}
                  className="absolute right-[-38px] top-1/2 -translate-y-1/2 group-hover/item:opacity-100"
                />
              </li>
            );
          })}
        </Tag>
      </div>

      {commented.length > 0 && (
        <div className="ml-auto flex w-[min(560px,84%)] flex-col gap-2 pr-2.5 pt-2">
          {commented.flatMap((it) =>
            commentsFor(it.index).map((c) => (
              <div
                key={c.id}
                onMouseEnter={() => setHighlight(it.index)}
                onMouseLeave={() => setHighlight(null)}
              >
                <div className="mb-1 flex items-center gap-1 pl-1 text-[11px] text-faint">
                  <CornerDownRight size={11} className="shrink-0" />
                  <span className="truncate">{snippet(it.cite, 52)}</span>
                </div>
                <CommentCard
                  comment={c}
                  isNew={c.id === "__new__"}
                  focusEdit={c.id === focusEditId}
                  onStatusChange={onStatusChange}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onCancel={onCancelCompose}
                />
              </div>
            )),
          )}
        </div>
      )}
    </div>
  );
}
