"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { sendConnectionRequestAction } from "@/app/actions/network.actions";
import { ActionButton } from "@/components/network/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/lib/client/api";
import { useDismissable } from "@/lib/client/useDismissable";
import { REACTION_META, REACTION_ORDER } from "./reactions";
import type { ReactorDTO } from "@/services/social/types";
import type { ReactionType } from "@prisma/client";

/** "People who reacted": filter by reaction type, see photo / name / headline / reaction, connect from here. */
export function ReactorsDialog({ postId, byType, total, onClose }: { postId: string; byType: Partial<Record<ReactionType, number>>; total: number; onClose: () => void }) {
  const [filter, setFilter] = useState<ReactionType | "ALL">("ALL");
  const [items, setItems] = useState<ReactorDTO[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(onClose, [onClose]);
  useDismissable(true, panel, close);

  const load = useCallback(async (type: ReactionType | "ALL", after?: string | null) => {
    try {
      const q = new URLSearchParams();
      if (type !== "ALL") q.set("type", type);
      if (after) q.set("cursor", after);
      const { data, pagination } = await api<ReactorDTO[]>(`/api/posts/${postId}/reactions?${q}`);
      setItems((prev) => (after && prev ? [...prev, ...data] : data));
      setCursor(pagination?.nextCursor ?? null);
      setHasMore(Boolean(pagination?.hasMore));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't load this list.");
      setItems((prev) => prev ?? []);
    }
  }, [postId]);

  useEffect(() => { setItems(null); void load(filter); }, [filter, load]);
  useEffect(() => { panel.current?.focus(); }, []);

  const tabs = REACTION_ORDER.filter((t) => (byType[t] ?? 0) > 0);

  return (
    <div className="modal-scrim" role="presentation">
      <div ref={panel} className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="reactors-title" tabIndex={-1}>
        <header className="modal-sheet-head">
          <h2 id="reactors-title" className="h6 mb-0">People who reacted</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><i className="bi bi-x-lg" aria-hidden="true" /></button>
        </header>
        <div className="reactor-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={filter === "ALL"} className={`reactor-tab ${filter === "ALL" ? "on" : ""}`} onClick={() => setFilter("ALL")}>All {total}</button>
          {tabs.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={filter === t} className={`reactor-tab ${filter === t ? "on" : ""}`} onClick={() => setFilter(t)}>
              <span aria-hidden="true">{REACTION_META[t].emoji}</span> {byType[t]}
            </button>
          ))}
        </div>
        <div className="modal-sheet-body">
          {items === null && <p className="text-muted small p-3 mb-0">Loading…</p>}
          {error && <p role="alert" className="text-danger small p-3 mb-0">{error}</p>}
          {items && items.length === 0 && !error && <p className="text-muted small p-3 mb-0">No reactions to show.</p>}
          <ul className="reactor-list">
            {items?.map((r) => (
              <li key={r.id} className="reactor">
                <span className="reactor-avatar">
                  <Avatar name={r.person.name} src={r.person.avatarUrl} size={44} />
                  <span className="reactor-emoji" aria-hidden="true">{REACTION_META[r.type].emoji}</span>
                </span>
                <span className="reactor-text">
                  <Link href={r.person.relationship === "self" ? "/profile" : `/people/${r.person.id}`} className="reactor-name text-truncate d-block" onClick={onClose}>{r.person.name}{r.person.relationship === "self" ? " (you)" : ""}</Link>
                  {r.person.headline && <span className="small text-muted text-truncate d-block">{r.person.headline}</span>}
                  <span className="visually-hidden">{REACTION_META[r.type].label}</span>
                </span>
                {r.person.relationship === "none" && (
                  <ActionButton action={sendConnectionRequestAction} fields={{ targetUserId: r.person.id }} label="Connect" icon="bi-person-plus" pendingText="…" />
                )}
                {r.person.relationship === "connection" && <span className="rel-chip">Connection</span>}
                {r.person.relationship === "following" && <span className="rel-chip">Following</span>}
              </li>
            ))}
          </ul>
          {hasMore && (
            <div className="text-center p-2">
              <button type="button" className="btn btn-soft btn-sm" disabled={loadingMore} onClick={async () => { setLoadingMore(true); await load(filter, cursor); setLoadingMore(false); }}>{loadingMore ? "Loading…" : "Show more"}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
