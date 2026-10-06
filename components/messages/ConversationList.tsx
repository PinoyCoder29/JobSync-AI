"use client";

import Link from "next/link";
import { formatBadge } from "@/components/layout/UnreadCounts";
import { Avatar } from "@/components/ui/Avatar";
import { relativeTime } from "@/lib/time";
import { useMessenger } from "./MessagesShell";

/** Left column / mobile inbox. Every text line is single-line with an ellipsis, so nothing can widen the list. */
export function ConversationList() {
  const { conversations, activeId } = useMessenger();
  return (
    <>
      <div className="messenger-head">
        <h1 className="messenger-title">Messages</h1>
      </div>

      {conversations.length === 0 ? (
        <div className="messenger-empty-list">
          <i className="bi bi-chat-dots" aria-hidden="true" />
          <h2 className="h6 mb-1">No conversations yet</h2>
          <p className="small text-muted mb-3">
            Open someone&apos;s profile and tap Message to start chatting.
          </p>
          <Link href="/network" className="btn btn-brand btn-sm">
            Find people in My Network
          </Link>
        </div>
      ) : (
        <ul className="conv-list">
          {conversations.map((c) => {
            const active = c.id === activeId;
            const preview = c.lastMessage
              ? c.lastMessage.deleted
                ? "Message deleted"
                : `${c.lastMessage.mine ? "You: " : ""}${c.lastMessage.preview}`
              : "";
            return (
              <li key={c.id}>
                <Link
                  href={`/messages/${c.id}`}
                  className={`conv-item ${active ? "active" : ""} ${c.unread > 0 ? "unread" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Avatar
                    name={c.person.name}
                    src={c.person.avatarUrl}
                    size={48}
                  />
                  <span className="conv-body">
                    <span className="conv-row">
                      <span
                        className="conv-name text-truncate"
                        title={c.person.name}
                      >
                        {c.person.name}
                      </span>
                      {c.lastMessageAt && (
                        <time
                          className="conv-time"
                          dateTime={c.lastMessageAt}
                          suppressHydrationWarning
                        >
                          {relativeTime(c.lastMessageAt)}
                        </time>
                      )}
                    </span>
                    <span className="conv-row">
                      <span className="conv-preview text-truncate">
                        {preview}
                      </span>
                      {c.unread > 0 && (
                        <span
                          className="conv-badge"
                          aria-label={`${c.unread} unread message${c.unread === 1 ? "" : "s"}`}
                        >
                          {formatBadge(c.unread)}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
