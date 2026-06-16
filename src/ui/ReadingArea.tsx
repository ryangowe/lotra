import { useRef, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import type { BlockData, CommentData, CommentStatus } from "../shared/types.ts";
import { CommentCard } from "./CommentCard.tsx";

const TINT: Record<string, string> = {
  requested: "bg-hi-req",
  note: "bg-hi-note",
  resolved: "bg-hi-done",
};

// urgency order: requested > note > resolved
function blockStatus(comments: CommentData[]): string {
  const rank: Record<string, number> = { requested: 3, note: 2, resolved: 1 };
  let top = "";
  for (const c of comments)
    if ((rank[c.status] ?? 0) > (rank[top] ?? 0)) top = c.status;
  return top;
}

export function ReadingArea({
  blocks,
  comments,
  focusEditId,
  onActiveBlock,
  onPlusClick,
  onStatusChange,
  onEdit,
  onDelete,
  onCancelCompose,
  scrollToRef,
}: {
  blocks: BlockData[];
  comments: CommentData[];
  focusEditId: string | null;
  onActiveBlock: (index: number | null) => void;
  onPlusClick: (index: number) => void;
  onStatusChange: (id: string, s: CommentStatus) => void;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  onCancelCompose: () => void;
  scrollToRef: React.RefObject<((index: number) => void) | null>;
}) {
  const mainRef = useRef<HTMLElement>(null);

  const scrollTo = useCallback((index: number) => {
    const el = mainRef.current?.querySelector<HTMLElement>(
      `[data-block-index="${index}"]`,
    );
    if (!el || !mainRef.current) return;
    const mr = mainRef.current.getBoundingClientRect();
    const br = el.getBoundingClientRect();
    mainRef.current.scrollTo({
      top: mainRef.current.scrollTop + (br.top - mr.top) - 40,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    scrollToRef.current = scrollTo;
  }, [scrollTo, scrollToRef]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const headingEls = main.querySelectorAll<HTMLElement>(
      "[data-block-index][data-heading]",
    );
    if (!headingEls.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = (e.target as HTMLElement).dataset.blockIndex;
            onActiveBlock(idx != null ? Number(idx) : null);
          }
        }
      },
      { root: main, rootMargin: "-10% 0px -80% 0px", threshold: 0 },
    );
    headingEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [blocks, onActiveBlock]);

  const commentsFor = useCallback(
    (index: number) => comments.filter((c) => c.blockIndex === index),
    [comments],
  );

  return (
    <main ref={mainRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[752px] px-[clamp(24px,4vw,52px)] pb-[200px] pt-[clamp(40px,4.5vw,76px)]">
        {blocks.map((block) => {
          const bc = commentsFor(block.index);
          const status = blockStatus(bc);
          return (
            <div
              key={block.index}
              className={`group ${block.heading ? "mt-7 first:mt-0" : "mt-3 first:mt-0"}`}
            >
              <div className="relative">
                <div
                  className={`md prose prose-lg max-w-none rounded-[10px] px-2.5 py-1.5 font-serif transition-colors ${status ? TINT[status] : "group-hover:bg-hl"}`}
                  data-block-index={block.index}
                  data-heading={block.heading ? block.heading.depth : undefined}
                  dangerouslySetInnerHTML={{ __html: block.html }}
                />
                <button
                  onClick={() => onPlusClick(block.index)}
                  title="Add comment"
                  className="absolute right-[-38px] top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full border border-line bg-paper text-accent opacity-0 shadow-[0_2px_6px_-1px_rgba(60,50,40,0.16)] transition hover:border-accent hover:bg-accent-soft group-hover:opacity-100"
                >
                  <Plus size={15} />
                </button>
              </div>
              {bc.length > 0 && (
                <div className="ml-auto flex w-[min(560px,84%)] flex-col gap-2 pr-2.5 pt-2">
                  {bc.map((c) => (
                    <CommentCard
                      key={c.id}
                      comment={c}
                      isNew={c.id === "__new__"}
                      focusEdit={c.id === focusEditId}
                      onStatusChange={onStatusChange}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onCancel={onCancelCompose}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
