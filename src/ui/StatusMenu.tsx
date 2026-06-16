import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import type { CommentStatus } from "../shared/types.ts";
import { STATUS_LABELS } from "./utils.ts";
import { StatusDot } from "./StatusDot.tsx";

const ORDER: CommentStatus[] = ["requested", "note", "resolved"];

const BADGE: Record<CommentStatus, string> = {
  requested: "bg-accent-soft text-accent-ink",
  note: "bg-note-soft text-note-ink",
  resolved: "bg-done-soft text-done-ink",
};

export function StatusMenu({
  status,
  onChange,
}: {
  status: CommentStatus;
  onChange: (s: CommentStatus) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center gap-1 rounded-md py-[3px] pl-2 pr-1.5 text-[10px] font-bold uppercase tracking-[0.05em] ${BADGE[status]}`}
        >
          {STATUS_LABELS[status]}
          <ChevronDown size={11} className="opacity-70" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          onClick={(e) => e.stopPropagation()}
          className="z-50 min-w-[166px] rounded-[10px] border border-line bg-paper p-1 shadow-[0_8px_26px_-10px_rgba(60,50,40,0.32)]"
        >
          {ORDER.map((s) => (
            <DropdownMenu.Item
              key={s}
              onSelect={() => onChange(s)}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-ink outline-none data-[highlighted]:bg-hl"
            >
              <StatusDot status={s} className="size-[7px]" />
              {STATUS_LABELS[s]}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
