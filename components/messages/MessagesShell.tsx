"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client/api";
import type { ConversationSummaryDTO } from "@/services/messaging/types";
import { ConversationList } from "./ConversationList";

type Messenger = { conversations: ConversationSummaryDTO[]; activeId: string | null; refresh: () => Promise<void> };
const MessengerContext = createContext<Messenger>({ conversations: [], activeId: null, refresh: async () => {} });
export const useMessenger = () => useContext(MessengerContext);

const POLL_MS = 10_000;

/**
 * The messenger frame: conversation list + the open chat.
 *  - ≥ 768px: two columns, both always visible.
 *  - < 768px: ONE pane at a time. `/messages` shows the list, `/messages/<id>` shows the chat full-screen (CSS keys off data-view).
 * It owns the inbox state so the open chat can refresh it after sending or reading.
 */
export function MessagesShell({ initial, children }: { initial: ConversationSummaryDTO[]; children: React.ReactNode }) {
  const pathname = usePathname() ?? "/messages";
  const activeId = /^\/messages\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
  const [conversations, setConversations] = useState(initial);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api<ConversationSummaryDTO[]>("/api/conversations");
      setConversations(data);
    } catch {
      /* keep what we have; the next poll retries */
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  const value = useMemo(() => ({ conversations, activeId, refresh }), [conversations, activeId, refresh]);

  return (
    <MessengerContext.Provider value={value}>
      <div className="messenger" data-view={activeId ? "chat" : "list"}>
        <aside className="messenger-sidebar" aria-label="Conversations">
          <ConversationList />
        </aside>
        <section className="messenger-main" aria-label="Chat">
          {children}
        </section>
      </div>
    </MessengerContext.Provider>
  );
}
