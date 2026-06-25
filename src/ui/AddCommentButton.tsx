import { Plus } from "lucide-react";

// The hover-revealed "add comment" affordance. Always mounted so the pointer can
// travel from the block onto it without it unmounting; the caller's className
// supplies position and the group-hover rule that fades it in.
export function AddCommentButton({
  onClick,
  className = "",
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title="Add comment"
      className={`grid size-7 place-items-center rounded-full border border-line bg-paper text-accent opacity-0 shadow-[0_2px_6px_-1px_rgba(60,50,40,0.16)] transition hover:border-accent hover:bg-accent-soft ${className}`}
    >
      <Plus size={15} />
    </button>
  );
}
