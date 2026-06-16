import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CommentData,
  CommentStatus,
  DocumentData,
} from "../shared/types.ts";
import {
  addComment,
  editComment,
  deleteComment,
  setCommentStatus,
} from "./api.ts";

function withComments(
  old: DocumentData,
  fn: (comments: CommentData[]) => CommentData[],
): DocumentData {
  return { ...old, comments: fn(old.comments) };
}

// Edits hit the server then refetch; the server is the single render source,
// so bodyHtml always comes back rendered rather than being built client-side.
export function useComments(file: string) {
  const qc = useQueryClient();
  const key = ["document", file];
  const [composingBlockIndex, setComposingBlockIndex] = useState<number | null>(
    null,
  );
  const [focusEditId, setFocusEditId] = useState<string | null>(null);

  const optimistic = (fn: (d: DocumentData) => DocumentData) =>
    qc.setQueryData<DocumentData>(key, (old) => (old ? fn(old) : old));
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CommentStatus }) =>
      setCommentStatus(file, id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<DocumentData>(key);
      optimistic((d) =>
        withComments(d, (cs) =>
          cs.map((c) => (c.id === id ? { ...c, status } : c)),
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: invalidate,
  });

  const editMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      composingBlockIndex !== null
        ? addComment(file, composingBlockIndex, body)
        : editComment(file, id, body),
    onSettled: () => {
      setComposingBlockIndex(null);
      invalidate();
    },
  });

  const deleteMut = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteComment(file, id),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<DocumentData>(key);
      optimistic((d) => withComments(d, (cs) => cs.filter((c) => c.id !== id)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: invalidate,
  });

  const startCompose = useCallback(
    (blockIndex: number) => {
      const data = qc.getQueryData<DocumentData>(key);
      if (!data) return;
      const composing = data.comments.find((c) => c.id === "__new__");
      if (composing) {
        setFocusEditId(null);
        setTimeout(() => setFocusEditId("__new__"), 0);
        return;
      }
      const existing = data.comments.find(
        (c) => c.blockIndex === blockIndex && c.id !== "__new__",
      );
      if (existing) {
        setFocusEditId(null);
        setTimeout(() => setFocusEditId(existing.id), 0);
        return;
      }
      optimistic((d) =>
        withComments(d, (cs) => [
          ...cs,
          {
            id: "__new__",
            blockIndex,
            status: "requested",
            body: "",
            bodyHtml: "",
          },
        ]),
      );
      setComposingBlockIndex(blockIndex);
    },
    [file],
  );

  const cancelCompose = useCallback(() => {
    optimistic((d) =>
      withComments(d, (cs) => cs.filter((c) => c.id !== "__new__")),
    );
    setComposingBlockIndex(null);
  }, [file]);

  return {
    focusEditId,
    startCompose,
    cancelCompose,
    onStatusChange: (id: string, status: CommentStatus) =>
      statusMut.mutate({ id, status }),
    onEdit: (id: string, body: string) => {
      setFocusEditId(null);
      editMut.mutate({ id, body });
    },
    onDelete: (id: string) => {
      if (id === "__new__") cancelCompose();
      else deleteMut.mutate({ id });
    },
    error: (statusMut.error ||
      editMut.error ||
      deleteMut.error) as Error | null,
  };
}
