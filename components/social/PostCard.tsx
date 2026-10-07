"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { CommentSection } from "./CommentSection";
import { PersonBadge } from "./PersonBadge";
import { ReactorsDialog } from "./ReactorsDialog";
import { REACTION_META, REACTION_ORDER } from "./reactions";
import { del, postJson } from "@/lib/client/api";
import { useDismissable } from "@/lib/client/useDismissable";
import { ARRANGEMENT_LABEL, EMPLOYMENT_LABEL, formatSalaryCompact } from "@/lib/labels";
import { MAX_POST_LENGTH, REPORT_REASONS, VISIBILITIES } from "@/lib/validations/post";
import type { PostDTO, SharedPostDTO } from "@/services/social/types";
import type { ReactionType } from "@prisma/client";

const REASON_LABEL: Record<(typeof REPORT_REASONS)[number], string> = { SPAM: "Spam", HARASSMENT: "Harassment", MISLEADING: "Misleading", INAPPROPRIATE: "Inappropriate", OTHER: "Something else" };
const VIS_LABEL = { PUBLIC: "Public", CONNECTIONS_ONLY: "Connections only", PRIVATE: "Only me" } as const;
const TYPE_BADGE: Partial<Record<PostDTO["postType"], { icon: string; label: string }>> = {
  PROJECT: { icon: "bi-rocket-takeoff", label: "Project" },
  ACHIEVEMENT: { icon: "bi-trophy", label: "Achievement" },
  CAREER_UPDATE: { icon: "bi-megaphone", label: "Career update" },
  JOB: { icon: "bi-briefcase", label: "Job" },
};

function MediaGrid({ media }: { media: PostDTO["media"] }) {
  if (media.length === 0) return null;
  return (
    <div className={`post-media post-media-${Math.min(media.length, 4)}`}>
      {media.map((m, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={m.url + i} src={m.url} alt={m.alt ?? "Image attached to post"} width={m.width ?? undefined} height={m.height ?? undefined} loading="lazy" decoding="async" />
      ))}
    </div>
  );
}

function SharedPreview({ shared }: { shared: SharedPostDTO }) {
  if (!shared.available) return <div className="shared-post shared-missing"><i className="bi bi-eye-slash" aria-hidden="true" /> This post isn&apos;t available anymore.</div>;
  return (
    <div className="shared-post">
      <PersonBadge author={shared.author} createdAt={shared.createdAt} size={32} />
      {shared.title && <p className="fw-semibold mb-1 mt-2">{shared.title}</p>}
      {shared.content && <p className="post-text mt-2 mb-2">{shared.content}</p>}
      <MediaGrid media={shared.media} />
      <Link href={`/posts/${shared.id}`} className="small">View original post</Link>
    </div>
  );
}

export function PostCard({ post: initial, onDeleted, onCreated, standalone }: { post: PostDTO; onDeleted?: (id: string) => void; onCreated?: (post: PostDTO) => void; standalone?: boolean }) {
  const [post, setPost] = useState(initial);
  const [reaction, setReaction] = useState<ReactionType | null>(initial.viewer.reaction);
  const [reactionCount, setReactionCount] = useState(initial.counts.reactions);
  const [commentCount, setCommentCount] = useState(initial.counts.comments);
  const [saved, setSaved] = useState(initial.viewer.saved);
  const [showComments, setShowComments] = useState(Boolean(standalone));
  const [picker, setPicker] = useState(false);
  const [showReactors, setShowReactors] = useState(false);
  const [menu, setMenu] = useState(false);
  const [panel, setPanel] = useState<null | "share" | "report" | "edit" | "delete">(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setMenu(false), []);
  const closePicker = useCallback(() => setPicker(false), []);
  useDismissable(menu, menuRef, closeMenu);
  useDismissable(picker, pickerRef, closePicker);

  async function react(type: ReactionType | null) {
    setPicker(false);
    const prev = reaction;
    const prevCount = reactionCount;
    const next = type === prev ? null : type; // clicking your current reaction removes it
    setReaction(next);
    setReactionCount(prevCount + (prev === null && next !== null ? 1 : prev !== null && next === null ? -1 : 0));
    setError(null);
    try {
      if (next) await postJson(`/api/posts/${post.id}/reactions`, { type: next });
      else await del(`/api/posts/${post.id}/reactions`);
    } catch (e) {
      setReaction(prev);
      setReactionCount(prevCount);
      setError(e instanceof Error ? e.message : "Couldn't update your reaction.");
    }
  }

  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    setError(null);
    try {
      await (next ? postJson(`/api/posts/${post.id}/save`) : del(`/api/posts/${post.id}/save`));
      setNotice(next ? "Saved to your saved posts." : null);
    } catch (e) {
      setSaved(!next);
      setError(e instanceof Error ? e.message : "Couldn't update.");
    }
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(false); }
  }

  const top = (Object.entries(post.counts.byType) as [ReactionType, number][]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const badge = TYPE_BADGE[post.postType];
  const canShare = post.visibility === "PUBLIC" || Boolean(post.shared);

  return (
    <article className="feed-card post-card" aria-label={`Post by ${post.author.name}`}>
      <header className="d-flex justify-content-between align-items-start gap-2">
        <PersonBadge author={post.author} createdAt={post.createdAt} visibility={post.visibility} edited={Boolean(post.editedAt)} />
        <div className="post-menu" ref={menuRef}>
          <button type="button" className="icon-btn" aria-label="More actions" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)}><i className="bi bi-three-dots" aria-hidden="true" /></button>
          {menu && (
            <div className="menu-panel" role="menu">
              {post.viewer.isAuthor ? (
                <>
                  <button role="menuitem" className="dropdown-item" onClick={() => { setPanel("edit"); setMenu(false); }}><i className="bi bi-pencil me-2" aria-hidden="true" />Edit post</button>
                  <button role="menuitem" className="dropdown-item text-danger" onClick={() => { setPanel("delete"); setMenu(false); }}><i className="bi bi-trash me-2" aria-hidden="true" />Delete post</button>
                </>
              ) : (
                <button role="menuitem" className="dropdown-item" onClick={() => { setPanel("report"); setMenu(false); }}><i className="bi bi-flag me-2" aria-hidden="true" />Report post</button>
              )}
              <button role="menuitem" className="dropdown-item" onClick={() => { void toggleSave(); setMenu(false); }}><i className={`bi ${saved ? "bi-bookmark-fill" : "bi-bookmark"} me-2`} aria-hidden="true" />{saved ? "Unsave" : "Save"}</button>
              <Link role="menuitem" className="dropdown-item" href={`/posts/${post.id}`} onClick={() => setMenu(false)}><i className="bi bi-box-arrow-up-right me-2" aria-hidden="true" />Open post</Link>
            </div>
          )}
        </div>
      </header>

      {badge && <div className="post-type-badge"><i className={`bi ${badge.icon}`} aria-hidden="true" /> {badge.label}</div>}
      {post.title && post.postType !== "JOB" && <h3 className="post-title">{post.title}</h3>}
      {post.content && <p className="post-text">{post.content}</p>}
      <MediaGrid media={post.media} />

      {post.linkUrl && (
        <a className="link-preview" href={post.linkUrl} target="_blank" rel="noopener noreferrer nofollow ugc">
          <i className="bi bi-link-45deg" aria-hidden="true" />
          <span className="min-w-0"><strong className="d-block text-truncate">{post.linkHost}</strong><span className="small text-muted d-block text-truncate">{post.linkUrl}</span></span>
          <i className="bi bi-box-arrow-up-right ms-auto" aria-hidden="true" />
        </a>
      )}

      {post.job && (
        post.job.isActive ? (
          <Link href={`/jobs/${post.job.id}`} className="job-preview">
            <strong>{post.job.title}</strong>
            <span className="text-muted small">{post.job.company} · {post.job.location}</span>
            <span className="small">{ARRANGEMENT_LABEL[post.job.workArrangement]} · {EMPLOYMENT_LABEL[post.job.employmentType]} · {formatSalaryCompact(post.job.salaryMin, post.job.salaryMax, post.job.currency)}/mo</span>
            {post.job.skills.length > 0 && <span className="d-flex flex-wrap gap-1 mt-1">{post.job.skills.slice(0, 4).map((s) => <span key={s} className="skill-badge">{s}</span>)}</span>}
          </Link>
        ) : <div className="job-preview job-preview-closed"><i className="bi bi-briefcase" aria-hidden="true" /> This job is no longer available.</div>
      )}

      {post.shared && <SharedPreview shared={post.shared} />}

      {(reactionCount > 0 || commentCount > 0 || post.counts.shares > 0) && (
        <div className="post-stats">
          {reactionCount > 0 && (
            <button type="button" className="link-btn stats-reactions" aria-haspopup="dialog" aria-label={`${reactionCount} ${reactionCount === 1 ? "reaction" : "reactions"}. See who reacted`} onClick={() => setShowReactors(true)}>
              {top.map(([t]) => <span key={t} aria-hidden="true">{REACTION_META[t].emoji}</span>)} {reactionCount}
            </button>
          )}
          <span className="ms-auto">
            {commentCount > 0 && <button type="button" className="link-btn" onClick={() => setShowComments(true)}>{commentCount} {commentCount === 1 ? "comment" : "comments"}</button>}
            {post.counts.shares > 0 && <span className="ms-2">{post.counts.shares} {post.counts.shares === 1 ? "share" : "shares"}</span>}
          </span>
        </div>
      )}

      <div className="post-actions" role="group" aria-label="Post actions">
        <div className="reaction-wrap" ref={pickerRef}>
          <button type="button" className={`action-btn ${reaction ? "on" : ""}`} aria-pressed={reaction !== null} onClick={() => react(reaction ?? "LIKE")} onContextMenu={(e) => { e.preventDefault(); setPicker(true); }}>
            <span aria-hidden="true">{reaction ? REACTION_META[reaction].emoji : "👍"}</span> {reaction ? REACTION_META[reaction].label : "Like"}
          </button>
          <button type="button" className="action-more" aria-label="Choose a reaction" aria-expanded={picker} onClick={() => setPicker((v) => !v)}><i className="bi bi-chevron-up" aria-hidden="true" /></button>
          {picker && (
            <div className="reaction-picker" role="menu" aria-label="Reactions">
              {REACTION_ORDER.map((t) => (
                <button key={t} role="menuitem" type="button" className={`reaction-opt ${reaction === t ? "on" : ""}`} onClick={() => react(t === reaction ? null : t)} aria-label={REACTION_META[t].label} title={REACTION_META[t].label}>{REACTION_META[t].emoji}</button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="action-btn" aria-expanded={showComments} onClick={() => setShowComments((v) => !v)}><i className="bi bi-chat" aria-hidden="true" /> Comment</button>
        <button type="button" className="action-btn" disabled={!canShare} title={canShare ? undefined : "Only public posts can be shared"} onClick={() => setPanel(panel === "share" ? null : "share")}><i className="bi bi-arrow-repeat" aria-hidden="true" /> Share</button>
        <button type="button" className={`action-btn ${saved ? "on" : ""}`} aria-pressed={saved} onClick={toggleSave}><i className={`bi ${saved ? "bi-bookmark-fill" : "bi-bookmark"}`} aria-hidden="true" /> Save</button>
      </div>

      {error && <p role="alert" className="small text-danger mt-2 mb-0">{error}</p>}
      {notice && !error && <p role="status" className="small text-muted mt-2 mb-0">{notice}</p>}

      {panel === "share" && <SharePanel postId={post.id} busy={busy} onCancel={() => setPanel(null)} onSubmit={(content, visibility) => run(async () => {
        const { data } = await postJson<PostDTO>(`/api/posts/${post.id}/share`, { content, visibility });
        setPanel(null); setNotice("Shared to your feed."); setPost((p) => ({ ...p, counts: { ...p.counts, shares: p.counts.shares + 1 } })); onCreated?.(data);
      })} />}

      {panel === "report" && (
        <div className="inline-panel" role="group" aria-label="Report this post">
          <span className="small me-2">Why are you reporting this post?</span>
          {REPORT_REASONS.map((r) => <button key={r} type="button" className="chip-btn" disabled={busy} onClick={() => run(async () => { await postJson(`/api/posts/${post.id}/report`, { reason: r }); setPanel(null); setNotice("Thanks. We'll review this post."); })}>{REASON_LABEL[r]}</button>)}
          <button type="button" className="link-btn" onClick={() => setPanel(null)}>Cancel</button>
        </div>
      )}

      {panel === "delete" && (
        <div className="inline-panel" role="alertdialog" aria-label="Confirm delete">
          <span className="small me-2">Delete this post? Its comments and images will be removed too.</span>
          <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={() => run(async () => { await del(`/api/posts/${post.id}`); onDeleted?.(post.id); })}>{busy ? "Deleting…" : "Delete"}</button>
          <button type="button" className="btn btn-sm btn-link" onClick={() => setPanel(null)}>Cancel</button>
        </div>
      )}

      {panel === "edit" && <EditPanel post={post} busy={busy} onCancel={() => setPanel(null)} onSave={(patch) => run(async () => {
        const res = await api_patch(post.id, patch);
        setPost(res); setPanel(null); setNotice("Post updated.");
      })} />}

      {showReactors && <ReactorsDialog postId={post.id} byType={post.counts.byType} total={reactionCount} onClose={() => setShowReactors(false)} />}

      {showComments && <CommentSection postId={post.id} onCountChange={(d) => setCommentCount((n) => Math.max(0, n + d))} />}
    </article>
  );
}

async function api_patch(id: string, body: { content?: string; title?: string; visibility?: PostDTO["visibility"] }): Promise<PostDTO> {
  const res = await fetch(`/api/posts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error?.message ?? "Couldn't update your post.");
  return json.data as PostDTO;
}

function SharePanel({ busy, onSubmit, onCancel }: { postId: string; busy: boolean; onSubmit: (content: string, visibility: PostDTO["visibility"]) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  const [vis, setVis] = useState<PostDTO["visibility"]>("PUBLIC");
  return (
    <div className="inline-panel d-block">
      <label className="form-label small mb-1" htmlFor="share-text">Add your thoughts (optional)</label>
      <textarea id="share-text" className="form-control" rows={2} maxLength={MAX_POST_LENGTH} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="d-flex flex-wrap gap-2 align-items-center mt-2">
        <select aria-label="Who can see your share" className="form-select form-select-sm w-auto" value={vis} onChange={(e) => setVis(e.target.value as PostDTO["visibility"])}>
          {VISIBILITIES.map((v) => <option key={v} value={v}>{VIS_LABEL[v]}</option>)}
        </select>
        <button type="button" className="btn btn-brand btn-sm" disabled={busy} onClick={() => onSubmit(text, vis)}>{busy ? "Sharing…" : "Share"}</button>
        <button type="button" className="btn btn-link btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function EditPanel({ post, busy, onSave, onCancel }: { post: PostDTO; busy: boolean; onSave: (p: { content?: string; title?: string; visibility?: PostDTO["visibility"] }) => void; onCancel: () => void }) {
  const [content, setContent] = useState(post.content ?? "");
  const [title, setTitle] = useState(post.title ?? "");
  const [vis, setVis] = useState(post.visibility);
  const hasTitle = post.postType === "PROJECT" || post.postType === "ACHIEVEMENT";
  return (
    <div className="inline-panel d-block">
      {hasTitle && (
        <>
          <label className="form-label small mb-1" htmlFor="edit-title">Title</label>
          <input id="edit-title" className="form-control mb-2" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        </>
      )}
      <label className="form-label small mb-1" htmlFor="edit-content">Post</label>
      <textarea id="edit-content" className="form-control" rows={3} maxLength={MAX_POST_LENGTH} value={content} onChange={(e) => setContent(e.target.value)} />
      <div className="d-flex flex-wrap gap-2 align-items-center mt-2">
        <select aria-label="Who can see this post" className="form-select form-select-sm w-auto" value={vis} onChange={(e) => setVis(e.target.value as PostDTO["visibility"])}>
          {VISIBILITIES.map((v) => <option key={v} value={v}>{VIS_LABEL[v]}</option>)}
        </select>
        <button type="button" className="btn btn-brand btn-sm" disabled={busy} onClick={() => onSave({ content, ...(hasTitle ? { title } : {}), visibility: vis })}>{busy ? "Saving…" : "Save changes"}</button>
        <button type="button" className="btn btn-link btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
