import { useState, useMemo } from "react";
import {
  ChevronRight,
  MessageSquare,
  FileText,
  AlignLeft,
  Check,
  Sun,
  Moon,
} from "lucide-react";
import type { BlockData, CommentData } from "../shared/types.ts";
import { snippet } from "./utils.ts";
import { StatusDot } from "./StatusDot.tsx";

interface TocEntry {
  index: number;
  depth: number;
  text: string;
  children: TocEntry[];
}

type HeadingBlock = BlockData & { heading: { depth: number; text: string } };

function buildTocTree(blocks: BlockData[]): TocEntry[] {
  const headings = blocks.filter(
    (b): b is HeadingBlock => !!b.heading && b.heading.depth >= 2,
  );
  const levels = [...new Set(headings.map((b) => b.heading.depth))].sort(
    (a, b) => a - b,
  );
  // show only the two shallowest heading levels to keep the outline compact
  const shown = new Set(levels.slice(0, 2));
  const filtered = headings.filter((b) => shown.has(b.heading.depth));

  const root: TocEntry[] = [];
  const stack: TocEntry[] = [];
  for (const b of filtered) {
    const entry: TocEntry = {
      index: b.index,
      depth: b.heading.depth,
      text: b.heading.text,
      children: [],
    };
    while (stack.length && stack.at(-1)!.depth >= entry.depth) stack.pop();
    (stack.length ? stack.at(-1)!.children : root).push(entry);
    stack.push(entry);
  }
  return root;
}

function OutlineNode({
  entry,
  depth,
  activeBlock,
  onNav,
}: {
  entry: TocEntry;
  depth: number;
  activeBlock: number | null;
  onNav: (index: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasKids = entry.children.length > 0;

  return (
    <div>
      <button
        onClick={() => onNav(entry.index)}
        style={{ paddingLeft: 8 + Math.min(depth, 3) * 14 }}
        className={`flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-[12.5px] transition-colors ${
          entry.index === activeBlock
            ? "bg-accent-soft font-semibold text-accent-ink"
            : "text-muted hover:bg-hl"
        }`}
      >
        {hasKids ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
            className="grid size-4 place-items-center text-faint"
          >
            <ChevronRight
              size={11}
              className={`transition-transform ${collapsed ? "" : "rotate-90"}`}
            />
          </span>
        ) : (
          <span className="grid size-4 place-items-center">
            <span className="size-[3px] rounded-full bg-faint opacity-50" />
          </span>
        )}
        <span className="truncate">{entry.text}</span>
      </button>
      {hasKids &&
        !collapsed &&
        entry.children.map((c) => (
          <OutlineNode
            key={c.index}
            entry={c}
            depth={depth + 1}
            activeBlock={activeBlock}
            onNav={onNav}
          />
        ))}
    </div>
  );
}

export function Sidebar({
  title,
  blocks,
  comments,
  activeBlock,
  theme,
  onToggleTheme,
  onNav,
}: {
  title: string;
  blocks: BlockData[];
  comments: CommentData[];
  activeBlock: number | null;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onNav: (index: number) => void;
}) {
  const toc = useMemo(() => buildTocTree(blocks), [blocks]);
  const unresolved = useMemo(
    () => comments.filter((c) => c.status !== "resolved"),
    [comments],
  );

  return (
    <aside className="flex w-[clamp(206px,20vw,300px)] flex-none flex-col border-r border-line bg-side">
      <div className="px-5 pb-4 pt-[22px]">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-md bg-accent text-on-accent">
            <MessageSquare size={14} />
          </div>
          <span className="font-semibold">lotra</span>
        </div>
        <div className="mt-1 text-xs text-muted">
          Long&#8202;Text Review &amp; Annotate
        </div>
        <div className="mt-3 flex items-center gap-1.5 font-mono text-xs text-muted">
          <FileText size={13} className="shrink-0" />
          <span className="truncate">{title}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-1">
        <div className="px-2 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.09em] text-faint">
          Outline
        </div>
        {toc.length === 0 ? (
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-faint">
            <AlignLeft size={14} />
            <span>No headings in this document</span>
          </div>
        ) : (
          <div>
            {toc.map((e) => (
              <OutlineNode
                key={e.index}
                entry={e}
                depth={0}
                activeBlock={activeBlock}
                onNav={onNav}
              />
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between px-2 py-1.5">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-faint">
            Needs attention
          </span>
          {unresolved.length > 0 && (
            <span className="rounded-full bg-accent-soft px-[7px] py-px text-[10.5px] font-bold text-accent-ink">
              {unresolved.length}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {comments.length === 0 ? (
            <div className="px-2 text-xs leading-relaxed text-muted">
              No comments yet. Hover a paragraph and click <strong>+</strong> to
              leave feedback.
            </div>
          ) : unresolved.length === 0 ? (
            <div className="flex items-center gap-1.5 px-2 text-xs text-muted">
              <Check size={15} /> All comments resolved
            </div>
          ) : (
            unresolved.map((c) => (
              <button
                key={c.id}
                onClick={() => c.blockIndex !== null && onNav(c.blockIndex)}
                className="flex items-start gap-2 rounded-[9px] border border-soft bg-paper p-2.5 text-left transition hover:translate-x-px hover:border-accent"
              >
                <StatusDot status={c.status} className="mt-1 size-[7px]" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-faint">
                    {c.status === "note" ? "Note" : "Change requested"}
                  </span>
                  <span className="truncate text-xs text-muted">
                    {snippet(c.body)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-soft px-3.5 py-3">
        <span className="text-xs text-muted">
          {comments.length} comment{comments.length === 1 ? "" : "s"}
        </span>
        <button
          onClick={onToggleTheme}
          title="Toggle theme"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-accent hover:text-ink"
        >
          {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>
    </aside>
  );
}
