"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client/api";
import type { UnreadCountsDTO } from "@/services/messaging/types";

const CHANGED_EVENT = "jobsync:unread-changed";
const POLL_MS = 20_000;

type Value = { counts: UnreadCountsDTO; refresh: () => Promise<void>; update: (counts: UnreadCountsDTO) => void };
const ZERO: UnreadCountsDTO = { notifications: 0, messages: 0 };
const UnreadContext = createContext<Value>({ counts: ZERO, refresh: async () => {}, update: () => {} });

/** Call after anything that changes what has been read (opening a chat, marking notifications read). */
export function announceUnreadChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGED_EVENT));
}

export const formatBadge = (n: number) => (n > 99 ? "99+" : String(n));

/**
 * One source of truth for the header/bottom-nav badges.
 * The app layout is rendered once and kept while you navigate, so a number computed on the server would go stale:
 * this refreshes it on an interval (only while the tab is visible), on focus, and when something announces a change.
 */
export function UnreadCountsProvider({ initial, children }: { initial: UnreadCountsDTO; children: React.ReactNode }) {
  const [counts, setCounts] = useState(initial);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api<UnreadCountsDTO>("/api/unread-counts");
      setCounts(data);
    } catch {
      /* keep the last known numbers; a failed badge refresh must never disturb the page */
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(tick, POLL_MS);
    window.addEventListener(CHANGED_EVENT, tick);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(CHANGED_EVENT, tick);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  const value = useMemo(() => ({ counts, refresh, update: setCounts }), [counts, refresh]);
  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export const useUnreadCounts = () => useContext(UnreadContext);
