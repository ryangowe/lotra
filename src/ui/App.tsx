import { useState, useRef, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import type { DocumentData } from "../shared/types.ts";
import { fetchDocument } from "./api.ts";
import { useComments } from "./useComments.ts";
import { Sidebar } from "./Sidebar.tsx";
import { ReadingArea } from "./ReadingArea.tsx";
import { SubmitFloat } from "./SubmitFloat.tsx";

export function App({ file }: { file: string }) {
  const { data, isError, error } = useQuery<DocumentData>({
    queryKey: ["document", file],
    queryFn: () => fetchDocument(file),
  });
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const scrollToRef = useRef<((index: number) => void) | null>(null);
  const comments = useComments(file);

  useEffect(() => {
    if (comments.error) toast.error(comments.error.message);
  }, [comments.error]);

  useEffect(() => {
    if (data?.title) document.title = data.title;
  }, [data?.title]);

  const unresolvedCount = useMemo(
    () => data?.comments.filter((c) => c.status !== "resolved").length ?? 0,
    [data],
  );

  if (isError)
    return (
      <div className="grid h-screen place-items-center bg-bg p-8 text-center text-muted">
        Failed to load document: {error?.message ?? "unknown error"}
      </div>
    );
  if (!data) return null;

  return (
    <div
      data-theme={theme}
      className="flex h-screen overflow-hidden bg-bg text-ink"
    >
      <Sidebar
        title={data.title}
        blocks={data.blocks}
        comments={data.comments}
        activeBlock={activeBlock}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onNav={(i) => scrollToRef.current?.(i)}
      />
      <ReadingArea
        blocks={data.blocks}
        comments={data.comments}
        focusEditId={comments.focusEditId}
        onActiveBlock={setActiveBlock}
        onPlusClick={comments.startCompose}
        onStatusChange={comments.onStatusChange}
        onEdit={comments.onEdit}
        onDelete={comments.onDelete}
        onCancelCompose={comments.cancelCompose}
        scrollToRef={scrollToRef}
      />
      <SubmitFloat file={file} unresolvedCount={unresolvedCount} />
      <Toaster position="top-center" />
    </div>
  );
}
