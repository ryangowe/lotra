import type { CommentStatus, DocumentData } from "../shared/types.ts";

async function postJson(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data.errors ? data.errors.join("; ") : (data.error ?? "request failed"),
    );
  }
  return data;
}

const q = (file: string) => `file=${encodeURIComponent(file)}`;

export async function fetchDocument(file: string): Promise<DocumentData> {
  const res = await fetch(`/api/document?${q(file)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "failed to load document");
  return data;
}

export const addComment = (
  file: string,
  blockIndex: number,
  body: string,
  status: CommentStatus,
) => postJson("/api/comment/add", { file, blockIndex, body, status });

export const editComment = (file: string, id: string, body: string) =>
  postJson("/api/comment/edit", { file, id, body });

export const deleteComment = (file: string, id: string) =>
  postJson("/api/comment/delete", { file, id });

export const setCommentStatus = (
  file: string,
  id: string,
  status: CommentStatus,
) => postJson("/api/comment/status", { file, id, status });

export async function submitToAgent(file: string): Promise<void> {
  const res = await fetch(`/submit?${q(file)}`, { method: "POST" });
  if (!res.ok) throw new Error("submit failed");
}

export async function pollStatus(file: string): Promise<{ waiters: number }> {
  const res = await fetch(`/status?${q(file)}`);
  return res.json();
}
