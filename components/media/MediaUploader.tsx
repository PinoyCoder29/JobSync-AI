"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

type Props = { kind: "avatar" | "cover"; currentUrl: string | null; name: string };

/** Client-side checks are only for fast feedback. The server validates type, size and file contents again. */
export function MediaUploader({ kind, currentUrl, name }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function send(request: () => Promise<Response>, success: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await request();
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error?.message ?? "Something went wrong. Please try again.");
      setMessage({ ok: true, text: success });
      router.refresh();
    } catch (error) {
      setPreview(null);
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Something went wrong." });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function onPick(file: File | undefined) {
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) return setMessage({ ok: false, text: "Choose a JPEG, PNG or WEBP image." });
    if (file.size > MAX_BYTES) return setMessage({ ok: false, text: "That image is over 5 MB." });
    setPreview(URL.createObjectURL(file));
    const body = new FormData();
    body.set("kind", kind);
    body.set("file", file);
    void send(() => fetch("/api/media", { method: "POST", body }), kind === "avatar" ? "Profile photo updated." : "Cover photo updated.");
  }

  const shown = preview ?? currentUrl;
  const inputId = `upload-${kind}`;
  const label = kind === "avatar" ? "profile photo" : "cover photo";

  return (
    <div className={`media-uploader media-uploader-${kind}`}>
      {kind === "avatar" ? (
        <Avatar name={name} src={shown} size={96} />
      ) : (
        <div className="cover-preview" style={shown ? { backgroundImage: `url(${shown})` } : undefined} role="img" aria-label={shown ? "Current cover photo" : "No cover photo"} />
      )}
      <div className="media-uploader-controls">
        <input ref={input} id={inputId} type="file" accept={ACCEPT} className="visually-hidden" disabled={busy} onChange={(e) => onPick(e.target.files?.[0])} />
        <label htmlFor={inputId} className={`btn btn-outline-brand btn-sm ${busy ? "disabled" : ""}`} aria-disabled={busy}>
          {busy ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Uploading…</> : <><i className="bi bi-camera me-1" aria-hidden="true" />{currentUrl ? "Change" : "Upload"} {label}</>}
        </label>
        {currentUrl && !busy && (
          <button type="button" className="btn btn-link btn-sm text-danger" onClick={() => window.confirm(`Remove your ${label}?`) && void send(() => fetch(`/api/media?kind=${kind}`, { method: "DELETE" }), "Removed.")}>
            Remove
          </button>
        )}
        <div className="form-text">JPEG, PNG or WEBP, up to 5 MB.</div>
        {message && <div role={message.ok ? "status" : "alert"} className={`small ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</div>}
      </div>
    </div>
  );
}
