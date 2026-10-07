"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PersonBadge } from "./PersonBadge";
import { api, del, postJson } from "@/lib/client/api";
import { useDismissable } from "@/lib/client/useDismissable";
import { MAX_COMMENT_LENGTH, REPORT_REASONS } from "@/lib/validations/post";
import type { CommentDTO } from "@/services/social/types";

const REASON_LABEL: Record<(typeof REPORT_REASONS)[number], string> = { SPAM: "Spam", HARASSMENT: "Harassment", MISLEADING: "Misleading", INAPPROPRIATE: "Inappropriate", OTHER: "Something else" };

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error?.message ?? "Something went wrong.");
  return json.data as T;
}

/** Facebook-style composer: one growing line, a round Send button. Enter sends on desktop, Shift+Enter adds a line. */
function CommentForm({ postId, parentId, autoFocus, placeholder, onAdded, onCancel }: { postId: string; parentId?: string; autoFocus?: boolean; placeholder: string; onAdded: (c: CommentDTO) => void; onCancel?: () => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  useEffect(() => {
    const el = ref.current;
    if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 120)}px`; }
  }, [text]);

  async function submit() {
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
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="comment-form">
      <label className="visually-hidden" htmlFor={`c-${postId}-${parentId ?? "root"}`}>{placeholder}</label>
      <div className="comment-input-row">
        <textarea
          ref={ref}
          id={`c-${postId}-${parentId ?? "root"}`}
          className="form-control"
          rows={1}
          value={text}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder={placeholder}
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !window.matchMedia("(pointer: coarse)").matches) { e.preventDefault(); void submit(); }
          }}
        />
        <button type="submit" className="btn btn-brand comment-send" disabled={busy || !text.trim()} aria-label={parentId ? "Send reply" : "Send comment"}>
          <i className="bi bi-send-fill" aria-hidden="true" />
        </button>
      </div>
      {(onCancel || error) && (
        <div className="d-flex gap-2 align-items-center mt-1">
          {onCancel && <button type="button" className="btn btn-link btn-sm p-0" onClick={onCancel}>Cancel</button>}
          {error && <span role="alert" className="small text-danger">{error}</span>}
        </div>
      )}
    </form>
  );
}

/** ⋯ menu for a comment: Edit / Delete for the author, Delete for the post owner, Report for everyone else. */
function CommentMenu({ items }: { items: { label: string; icon: string; danger?: boolean; run: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissable(open, ref, close);
  if (items.length === 0) return null;
  return (
    <div className="comment-menu" ref={ref}>
      <button type="button" className="icon-btn" aria-label="Comment options" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <i className="bi bi-three-dots" aria-hidden="true" />
      </button>
      {open && (
        <div className="menu-panel" role="menu">
          {items.map((it) => (
            <button key={it.label} role="menuitem" type="button" className={`dropdown-item ${it.danger ? "text-danger" : ""}`} onClick={() => { setOpen(false); it.run(); }}>
              <i className={`bi ${it.icon} me-2`} aria-hidden="true" />{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment: initial, postId, isReply, onDeleted, onReplyAdded }: { comment: CommentDTO; postId: string; isReply?: boolean; onDeleted: (id: string) => void; onReplyAdded?: (parentId: string, c: CommentDTO) => void }) {
  const [comment, setComment] = useState(initial);
  const [liked, setLiked] = useState(initial.viewer.reaction !== null);
  const [likes, setLikes] = useState(initial.reactionCount);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial.content);
  const [saving, setSaving] = useState(false);
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

  async function saveEdit() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await patchJson<CommentDTO>(`/api/comments/${comment.id}`, { content: draft });
      setComment((c) => ({ ...c, content: updated.content, editedAt: updated.editedAt }));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your change.");
    } finally {
      setSaving(false);
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

  const menu = [
    ...(comment.viewer.canEdit ? [{ label: "Edit", icon: "bi-pencil", run: () => { setDraft(comment.content); setEditing(true); } }] : []),
    ...(comment.viewer.canDelete ? [{ label: "Delete", icon: "bi-trash", danger: true, run: remove }] : []),
    ...(!own && !reported ? [{ label: "Report", icon: "bi-flag", run: () => setReporting(true) }] : []),
  ];

  return (
    <div className={`comment ${isReply ? "comment-reply" : ""}`}>
      <div className="d-flex justify-content-between align-items-start gap-2">
        <PersonBadge author={comment.author} createdAt={comment.createdAt} size={isReply ? 28 : 34} edited={Boolean(comment.editedAt)} />
        <CommentMenu items={menu} />
      </div>

      {editing ? (
        <div className="comment-edit">
          <label className="visually-hidden" htmlFor={`edit-${comment.id}`}>Edit your comment</label>
          <textarea id={`edit-${comment.id}`} className="form-control" rows={2} maxLength={MAX_COMMENT_LENGTH} value={draft} autoFocus onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }} />
          <div className="d-flex gap-2 mt-1">
            <button type="button" className="btn btn-brand btn-sm" disabled={saving || !draft.trim()} onClick={saveEdit}>{saving ? "Saving…" : "Save"}</button>
            <button type="button" className="btn btn-link btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <p className="comment-body">{comment.content}</p>
      )}

      <div className="comment-actions">
        <button type="button" className={`link-btn ${liked ? "on" : ""}`} onClick={toggleLike} aria-pressed={liked}>Like{likes > 0 ? ` · ${likes}` : ""}</button>
        {!isReply && <button type="button" className="link-btn" onClick={() => setReplying((v) => !v)}>Reply</button>}
        {reported && <span className="small text-muted">Reported. Thanks.</span>}
      </div>
      {error && <p role="alert" className="small text-danger mb-1">{error}</p>}
      {reporting && (
        <div className="inline-panel" role="group" aria-label="Report reason">
          <span className="small me-2">Why are you reporting this?</span>
          {REPORT_REASONS.map((r) => <button key={r} type="button" className="chip-btn" onClick={() => report(r)}>{REASON_LABEL[r]}</button>)}
          <button type="button" className="link-btn" onClick={() => setReporting(false)}>Cancel</button>
        </div>
      )}
      {replying && !isReply && (
        <CommentForm postId={postId} parentId={comment.id} autoFocus placeholder={`Reply to ${comment.author.name}…`} onCancel={() => setReplying(false)} onAdded={(c) => { setReplying(false); onReplyAdded?.(comment.id, c); }} />
      )}
    </div>
  );
}

/**
 * Opens inside the feed card (no navigation). Real comments from the database, newest at the bottom, the composer
 * stays pinned under the list so the post stays in view while you read and write.
 */
export function CommentSection({ postId, onCountChange }: { postId: string; onCountChange?: (delta: number) => void }) {
  const [items, setItems] = useState<CommentDTO[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(false);

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
  // after posting, scroll your new comment into view
  useEffect(() => {
    if (stick.current && listRef.current) { listRef.current.scrollTop = listRef.current.scrollHeight; stick.current = false; }
  }, [items]);

  const addTop = (c: CommentDTO) => { stick.current = true; setItems((prev) => [...(prev ?? []), c]); onCountChange?.(1); };
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
      <h4 className="comments-title">Comments</h4>
      <div className="comments-scroll" ref={listRef}>
        {items === null && <div className="comment-skel" aria-hidden="true"><div className="skeleton" style={{ height: 14, width: "40%" }} /><div className="skeleton mt-2" style={{ height: 12, width: "80%" }} /></div>}
        {error && <p role="alert" className="small text-danger mt-2">{error} <button type="button" className="link-btn" onClick={() => load()}>Try again</button></p>}
        {items && items.length === 0 && !error && <p className="small text-muted my-2">No comments yet. Be the first to comment.</p>}
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
            {loadingMore ? "Loading…" : "View more comments"}
          </button>
        )}
      </div>
      <CommentForm postId={postId} placeholder="Write a comment…" onAdded={addTop} />
    </section>
  );
}
