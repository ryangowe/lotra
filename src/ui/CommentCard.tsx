import { useState, useRef, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Trash2, Check } from "lucide-react";
import type { CommentData, CommentStatus } from "../shared/types.ts";
import { snippet } from "./utils.ts";
import { StatusMenu } from "./StatusMenu.tsx";

const LEFT_BORDER: Record<CommentStatus, string> = {
  requested: "border-l-accent",
  note: "border-l-note",
  resolved: "border-l-done",
};
const RING: Record<CommentStatus, string> = {
  requested: "ring-accent",
  note: "ring-note",
  resolved: "ring-done",
};

export function CommentCard({
  comment,
  isNew,
  focusEdit,
  onStatusChange,
  onEdit,
  onDelete,
  onCancel,
}: {
  comment: CommentData;
  isNew?: boolean;
  focusEdit?: boolean;
  onStatusChange: (id: string, status: CommentStatus) => void;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  onCancel?: () => void;
}) {
  const [editing, setEditing] = useState(!!isNew);
  const [draft, setDraft] = useState(comment.body);
  const cardRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [collapsed, setCollapsed] = useState(
    comment.status === "resolved" && !editing,
  );

  useEffect(() => {
    setCollapsed(comment.status === "resolved" && !editing);
  }, [comment.status, editing]);
  // fire only on focusEdit's rising edge; editing is read but intentionally not a dep
  useEffect(() => {
    if (focusEdit && !editing) setEditing(true);
  }, [focusEdit]);
  useEffect(() => {
    if (editing) taRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Element;
      // the status menu renders in a Radix portal outside cardRef; ignore it
      if (target?.closest?.("[data-radix-popper-content-wrapper]")) return;
      if (cardRef.current && !cardRef.current.contains(target)) save();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [editing, draft]);

  function save() {
    const body = draft.trim();
    if (isNew && !body) {
      onCancel?.();
      return;
    }
    setEditing(false);
    if (body && (body !== comment.body || isNew)) onEdit(comment.id, body);
  }

  function discard() {
    if (isNew) {
      onCancel?.();
      return;
    }
    setDraft(comment.body);
    setEditing(false);
  }

  if (collapsed) {
    return (
      <div
        ref={cardRef}
        onClick={() => setCollapsed(false)}
        className="flex cursor-pointer items-center gap-2 rounded-xl border border-soft bg-paper px-[11px] py-[7px] opacity-90"
      >
        <Check size={14} className="shrink-0 text-done" />
        <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-done-ink">
          Resolved
        </span>
        <span className="truncate text-xs text-faint">
          {snippet(comment.body, 60)}
        </span>
        <span className="ml-auto font-mono text-[11px] text-faint">
          {comment.id}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      onClick={() => {
        if (!editing) setEditing(true);
      }}
      className={`rounded-xl border border-l-[3px] border-line ${LEFT_BORDER[comment.status]} bg-paper px-3 pb-2.5 pt-[9px] shadow-[0_1px_2px_rgba(60,50,40,0.05),0_8px_18px_-14px_rgba(60,50,40,0.18)] [animation:lotra-up_0.18s_ease] ${editing ? `ring-[1.5px] ${RING[comment.status]}` : "cursor-text"}`}
    >
      <div className="flex items-center gap-2">
        <StatusMenu
          status={comment.status}
          onChange={(s) => onStatusChange(comment.id, s)}
        />
        <span className="font-mono text-[11px] text-faint">
          {comment.id === "__new__" ? "" : comment.id}
        </span>
        <button
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(comment.id);
          }}
          className="ml-auto grid size-6 place-items-center rounded-md text-faint hover:bg-hl hover:text-ink"
        >
          <Trash2 size={13} />
        </button>
      </div>
      {editing ? (
        <>
          <TextareaAutosize
            ref={taRef}
            value={draft}
            placeholder="Add a comment for the agent…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                discard();
              }
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
            className="mt-1.5 min-h-[40px] w-full resize-none bg-transparent text-[13.5px] leading-[1.55] text-ink outline-none"
          />
          <div className="mt-1 text-[10.5px] text-faint">
            Click outside to save · Esc to discard
          </div>
        </>
      ) : (
        <div
          className="md prose prose-sm mt-1 max-w-none text-[13.5px] leading-[1.55]"
          dangerouslySetInnerHTML={{ __html: comment.bodyHtml }}
        />
      )}
    </div>
  );
}
