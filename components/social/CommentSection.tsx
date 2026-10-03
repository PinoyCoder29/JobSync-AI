"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PersonBadge } from "./PersonBadge";
import { api, del, postJson } from "@/lib/client/api";
import { MAX_COMMENT_LENGTH, REPORT_REASONS } from "@/lib/validations/post";
import type { CommentDTO } from "@/services/social/types";

const REASON_LABEL: Record<(typeof REPORT_REASONS)[number], string> = { SPAM: "Spam", HARASSMENT: "Harassment", MISLEADING: "Misleading", INAPPROPRIATE: "Inappropriate", OTHER: "Something else" };

function CommentForm({ postId, parentId, autoFocus, placeholder, onAdded, onCancel }: { postId: string; parentId?: string; autoFocus?: boolean; placeholder: string; onAdded: (c: CommentDTO) => void; onCancel?: () => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await postJson<CommentDTO>(`/api/posts/${postId}/comments`, { content: text, parentId });
      setText("");
      onAdded(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post your comment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="comment-form">
      <label className="visually-hidden" htmlFor={`c-${postId}-${parentId ?? "root"}`}>{placeholder}</label>
      <textarea ref={ref} id={`c-${postId}-${parentId ?? "root"}`} className="form-control" rows={1} value={text} maxLength={MAX_COMMENT_LENGTH} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
      <div className="d-flex gap-2 align-items-center mt-1">
        <button type="submit" className="btn btn-brand btn-sm" disabled={busy || !text.trim()}>{busy ? "Posting…" : parentId ? "Reply" : "Comment"}</button>
        {onCancel && <button type="button" className="btn btn-link btn-sm" onClick={onCancel}>Cancel</button>}
        {error && <span role="alert" className="small text-danger">{error}</span>}
      </div>
    </form>
  );
}

function CommentItem({ comment, postId, isReply, onDeleted, onReplyAdded }: { comment: CommentDTO; postId: string; isReply?: boolean; onDeleted: (id: string) => void; onReplyAdded?: (parentId: string, c: CommentDTO) => void }) {
  const [liked, setLiked] = useState(comment.viewer.reaction !== null);
  const [likes, setLikes] = useState(comment.reactionCount);
  const [replying, setReplying] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const own = comment.author.relationship === "self";

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    try {
      await (next ? postJson(`/api/comments/${comment.id}/reactions`, { type: "LIKE" }) : del(`/api/comments/${comment.id}/reactions`));
    } catch (e) {
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
      setError(e instanceof Error ? e.message : "Try again.");
    }
  }

  async function remove() {
    if (!window.confirm(isReply ? "Delete this reply?" : "Delete this comment and its replies?")) return;
    try {
      await del(`/api/comments/${comment.id}`);
      onDeleted(comment.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete.");
    }
  }

  async function report(reason: string) {
    try {
      await postJson(`/api/comments/${comment.id}/report`, { reason });
      setReported(true);
      setReporting(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your report.");
      setReporting(false);
    }
  }

  return (
    <div className={`comment ${isReply ? "comment-reply" : ""}`}>
      <PersonBadge author={comment.author} createdAt={comment.createdAt} size={isReply ? 28 : 34} />
      <p className="comment-body">{comment.content}</p>
      <div className="comment-actions">
        <button type="button" className={`link-btn ${liked ? "on" : ""}`} onClick={toggleLike} aria-pressed={liked}>Like{likes > 0 ? ` · ${likes}` : ""}</button>
        {!isReply && <button type="button" className="link-btn" onClick={() => setReplying((v) => !v)}>Reply</button>}
        {comment.viewer.canDelete && <button type="button" className="link-btn" onClick={remove}>Delete</button>}
        {!own && !reported && <button type="button" className="link-btn" onClick={() => setReporting((v) => !v)}>Report</button>}
        {reported && <span className="small text-muted">Reported. Thanks.</span>}
      </div>
      {error && <p role="alert" className="small text-danger mb-1">{error}</p>}
      {reporting && (
        <div className="inline-panel" role="group" aria-label="Report reason">
          <span className="small me-2">Why are you reporting this?</span>
          {REPORT_REASONS.map((r) => <button key={r} type="button" className="chip-btn" onClick={() => report(r)}>{REASON_LABEL[r]}</button>)}
        </div>
      )}
      {replying && !isReply && (
        <CommentForm postId={postId} parentId={comment.id} autoFocus placeholder={`Reply to ${comment.author.name}…`} onCancel={() => setReplying(false)} onAdded={(c) => { setReplying(false); onReplyAdded?.(comment.id, c); }} />
      )}
    </div>
  );
}

export function CommentSection({ postId, onCountChange }: { postId: string; onCountChange?: (delta: number) => void }) {
  const [items, setItems] = useState<CommentDTO[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (after?: string | null) => {
    try {
      const { data, pagination } = await api<CommentDTO[]>(`/api/posts/${postId}/comments${after ? `?cursor=${encodeURIComponent(after)}` : ""}`);
      setItems((prev) => (after && prev ? [...prev, ...data] : data));
      setCursor(pagination?.nextCursor ?? null);
      setHasMore(Boolean(pagination?.hasMore));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't load comments.");
      setItems((prev) => prev ?? []);
    }
  }, [postId]);

  useEffect(() => { void load(); }, [load]);

  const addTop = (c: CommentDTO) => { setItems((prev) => [...(prev ?? []), c]); onCountChange?.(1); };
  const addReply = (parentId: string, c: CommentDTO) => {
    setItems((prev) => (prev ?? []).map((p) => (p.id === parentId ? { ...p, replies: [...p.replies, c], replyCount: p.replyCount + 1 } : p)));
    onCountChange?.(1);
  };
  const removeComment = (id: string) => {
    setItems((prev) => {
      const list = prev ?? [];
      const top = list.find((c) => c.id === id);
      if (top) { onCountChange?.(-(1 + top.replies.length)); return list.filter((c) => c.id !== id); }
      onCountChange?.(-1);
      return list.map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== id) }));
    });
  };

  return (
    <section className="comments" aria-label="Comments">
      <CommentForm postId={postId} placeholder="Add a comment…" onAdded={addTop} />
      {items === null && <div className="comment-skel" aria-hidden="true"><div className="skeleton" style={{ height: 14, width: "40%" }} /><div className="skeleton mt-2" style={{ height: 12, width: "80%" }} /></div>}
      {error && (
        <p role="alert" className="small text-danger mt-2">{error} <button type="button" className="link-btn" onClick={() => load()}>Try again</button></p>
      )}
      {items && items.length === 0 && !error && <p className="small text-muted mt-2 mb-0">No comments yet. Start the conversation.</p>}
      {items && items.length > 0 && (
        <ul className="comment-list">
          {items.map((c) => (
            <li key={c.id}>
              <CommentItem comment={c} postId={postId} onDeleted={removeComment} onReplyAdded={addReply} />
              {c.replies.length > 0 && (
                <ul className="comment-list reply-list">
                  {c.replies.map((r) => <li key={r.id}><CommentItem comment={r} postId={postId} isReply onDeleted={removeComment} /></li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
      {hasMore && (
        <button type="button" className="btn btn-link btn-sm" disabled={loadingMore} onClick={async () => { setLoadingMore(true); await load(cursor); setLoadingMore(false); }}>
          {loadingMore ? "Loading…" : "Load more comments"}
        </button>
      )}
    </section>
  );
}
