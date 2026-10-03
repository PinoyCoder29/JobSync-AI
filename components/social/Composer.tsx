"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/lib/client/api";
import { MAX_POST_IMAGES, MAX_POST_LENGTH, VISIBILITIES } from "@/lib/validations/post";
import type { JobSummaryDTO, PostDTO } from "@/services/social/types";

type Mode = "TEXT" | "IMAGE" | "JOB" | "PROJECT" | "ACHIEVEMENT" | "CAREER_UPDATE";
const ACTIONS: { mode: Mode; icon: string; label: string }[] = [
  { mode: "IMAGE", icon: "bi-camera", label: "Photo" },
  { mode: "JOB", icon: "bi-briefcase", label: "Job" },
  { mode: "PROJECT", icon: "bi-rocket-takeoff", label: "Project" },
  { mode: "ACHIEVEMENT", icon: "bi-trophy", label: "Achievement" },
  { mode: "CAREER_UPDATE", icon: "bi-megaphone", label: "Career update" },
];
const VIS_LABEL = { PUBLIC: "Public", CONNECTIONS_ONLY: "Connections only", PRIVATE: "Only me" } as const;
const MAX_MB = 5;

export function Composer({ name, avatarUrl, onPosted }: { name: string; avatarUrl: string | null; onPosted: (post: PostDTO) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("TEXT");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [visibility, setVisibility] = useState<(typeof VISIBILITIES)[number]>("PUBLIC");
  const [files, setFiles] = useState<File[]>([]);
  const [job, setJob] = useState<{ id: string; title: string; company: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function start(m: Mode) {
    setOpen(true);
    setMode(m);
    if (m === "IMAGE") setTimeout(() => fileRef.current?.click(), 0);
  }
  function reset() {
    setOpen(false); setMode("TEXT"); setContent(""); setTitle(""); setLinkUrl(""); setFiles([]); setJob(null); setError(null);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const picked = [...list];
    const bad = picked.find((f) => !["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > MAX_MB * 1024 * 1024);
    if (bad) { setError(`Use JPG, PNG or WebP images up to ${MAX_MB} MB.`); return; }
    setError(null);
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_POST_IMAGES));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const postType = files.length > 0 && mode === "TEXT" ? "IMAGE" : mode === "IMAGE" && files.length === 0 ? "TEXT" : mode;
    if (postType === "JOB" && !job) return setError("Choose a job to share.");
    if (postType === "PROJECT" && !title.trim()) return setError("Give your project a name.");
    if (!content.trim() && !title.trim() && files.length === 0 && !job && !linkUrl.trim()) return setError("Write something to share.");

    const form = new FormData();
    form.set("postType", linkUrl.trim() && postType === "TEXT" ? "LINK" : postType);
    form.set("visibility", visibility);
    if (content.trim()) form.set("content", content);
    if (title.trim()) form.set("title", title);
    if (linkUrl.trim()) form.set("linkUrl", linkUrl);
    if (job) form.set("jobId", job.id);
    files.forEach((f) => form.append("images", f));

    setBusy(true);
    try {
      const { data } = await api<PostDTO>("/api/posts", { method: "POST", body: form });
      onPosted(data);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't publish your post. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="feed-card composer" aria-label="Create a post">
      <div className="d-flex gap-3 align-items-center">
        <Avatar name={name} src={avatarUrl} size={44} />
        {!open ? (
          <button type="button" className="composer-trigger" onClick={() => start("TEXT")}>What&apos;s happening in your career?</button>
        ) : (
          <strong>What&apos;s happening in your career?</strong>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="mt-3">
          {(mode === "PROJECT" || mode === "ACHIEVEMENT") && (
            <>
              <label htmlFor="post-title" className="visually-hidden">{mode === "PROJECT" ? "Project name" : "Achievement title"}</label>
              <input id="post-title" className="form-control mb-2" maxLength={120} placeholder={mode === "PROJECT" ? "Project name" : "Achievement (optional title)"} value={title} onChange={(e) => setTitle(e.target.value)} />
            </>
          )}
          <label htmlFor="post-content" className="visually-hidden">Post text</label>
          <textarea id="post-content" className="form-control" rows={4} autoFocus maxLength={MAX_POST_LENGTH} value={content} onChange={(e) => setContent(e.target.value)}
            placeholder={mode === "JOB" ? "Say why this job caught your eye…" : mode === "PROJECT" ? "What did you build and what did you learn?" : mode === "ACHIEVEMENT" ? "Tell people what you achieved…" : "Share an update, an idea, or a question…"} />
          <div className="small text-muted text-end">{content.length}/{MAX_POST_LENGTH}</div>

          {mode === "JOB" && <JobPicker selected={job} onSelect={setJob} />}

          {(mode === "TEXT" || mode === "PROJECT" || mode === "CAREER_UPDATE") && (
            <>
              <label htmlFor="post-link" className="visually-hidden">Link (optional)</label>
              <input id="post-link" type="url" inputMode="url" className="form-control form-control-sm mt-1" placeholder="Add a link (https://…)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            </>
          )}

          {previews.length > 0 && (
            <div className="composer-previews">
              {previews.map((src, i) => (
                <div key={src} className="composer-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Selected image ${i + 1}`} />
                  <button type="button" className="icon-btn" aria-label={`Remove image ${i + 1}`} onClick={() => setFiles((f) => f.filter((_, j) => j !== i))}><i className="bi bi-x-lg" aria-hidden="true" /></button>
                </div>
              ))}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />

          {error && <p role="alert" className="small text-danger mt-2 mb-0">{error}</p>}

          <div className="d-flex flex-wrap gap-2 align-items-center mt-3">
            <button type="button" className="btn btn-soft btn-sm" onClick={() => fileRef.current?.click()} disabled={files.length >= MAX_POST_IMAGES}><i className="bi bi-image me-1" aria-hidden="true" />Add photo</button>
            <select aria-label="Who can see this post" className="form-select form-select-sm w-auto" value={visibility} onChange={(e) => setVisibility(e.target.value as typeof visibility)}>
              {VISIBILITIES.map((v) => <option key={v} value={v}>{VIS_LABEL[v]}</option>)}
            </select>
            <span className="ms-auto d-flex gap-2">
              <button type="button" className="btn btn-link btn-sm" onClick={reset} disabled={busy}>Cancel</button>
              <button type="submit" className="btn btn-brand btn-sm" disabled={busy}>{busy ? (files.length ? "Uploading…" : "Posting…") : "Post"}</button>
            </span>
          </div>
        </form>
      )}

      {!open && (
        <div className="composer-actions" role="group" aria-label="Post type">
          {ACTIONS.map((a) => (
            <button key={a.mode} type="button" className="composer-action" onClick={() => start(a.mode)}>
              <i className={`bi ${a.icon}`} aria-hidden="true" /> <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** Search real, active jobs through the API. Nothing is invented: only a job that exists can be attached. */
function JobPicker({ selected, onSelect }: { selected: { id: string; title: string; company: string } | null; onSelect: (j: { id: string; title: string; company: string } | null) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<JobSummaryDTO[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const term = q.trim();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api<JobSummaryDTO[]>(`/api/jobs?${term ? `keyword=${encodeURIComponent(term)}&` : ""}sort=newest&limit=6`);
        setResults(data);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  if (selected) {
    return (
      <div className="job-preview mt-2">
        <strong>{selected.title}</strong><span className="text-muted small">{selected.company}</span>
        <button type="button" className="link-btn align-self-start" onClick={() => onSelect(null)}>Choose a different job</button>
      </div>
    );
  }
  return (
    <div className="mt-2">
      <label htmlFor="job-pick" className="visually-hidden">Search jobs to share</label>
      <input id="job-pick" className="form-control form-control-sm" type="search" placeholder="Search for a job to share" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="picker-list" aria-busy={loading}>
        {results.map((j) => (
          <li key={j.id}><button type="button" onClick={() => onSelect({ id: j.id, title: j.title, company: j.company })}><strong>{j.title}</strong> <span className="text-muted small">· {j.company}</span></button></li>
        ))}
        {!loading && results.length === 0 && <li className="small text-muted p-2">No jobs found.</li>}
      </ul>
    </div>
  );
}
