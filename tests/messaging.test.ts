import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { canDeleteMessage, canMessageUser, isParticipant, messagingDeniedReason } from "@/lib/permissions/messaging";
import { pairKeyFor } from "@/lib/permissions/network";
import { enforceRateLimit, resetRateLimits } from "@/lib/rate-limit";
import { buildThread, dayLabel, mergeMessages, previewText, totalUnread, type LocalMessage } from "@/lib/messaging/thread";
import { sendMessageSchema, messagePageQuerySchema } from "@/lib/validations/message";
import { notificationHref } from "@/services/social/notification.service";
import type { MessageDTO } from "@/services/messaging/types";

const base = { senderId: "a", recipientId: "b", connected: false, blocked: false } as const;

describe("who can be messaged", () => {
  it("anyone with a public profile", () => assert.equal(canMessageUser({ ...base, recipientVisibility: "PUBLIC" }), true));
  it("connections-only profiles need a connection", () => {
    assert.equal(canMessageUser({ ...base, recipientVisibility: "CONNECTIONS_ONLY" }), false);
    assert.equal(canMessageUser({ ...base, recipientVisibility: "CONNECTIONS_ONLY", connected: true }), true);
  });
  it("private profiles can't be messaged, even by connections", () => assert.equal(canMessageUser({ ...base, recipientVisibility: "PRIVATE", connected: true }), false));
  it("a block in either direction always wins", () => assert.equal(canMessageUser({ ...base, recipientVisibility: "PUBLIC", blocked: true }), false));
  it("you can't message yourself", () => assert.equal(canMessageUser({ ...base, recipientId: "a", recipientVisibility: "PUBLIC" }), false));
  it("explains a denial without mentioning blocks", () => {
    assert.match(messagingDeniedReason("Camille", "CONNECTIONS_ONLY"), /once you're connected/);
    assert.match(messagingDeniedReason("Camille", "PRIVATE"), /isn't accepting/);
  });
});

describe("conversation access and deletion", () => {
  it("only participants have access", () => {
    assert.equal(isParticipant(["a", "b"], "a"), true);
    assert.equal(isParticipant(["a", "b"], "c"), false);
  });
  it("only the sender can delete, and only once", () => {
    assert.equal(canDeleteMessage("a", { senderId: "a", deletedAt: null }), true);
    assert.equal(canDeleteMessage("b", { senderId: "a", deletedAt: null }), false);
    assert.equal(canDeleteMessage("a", { senderId: "a", deletedAt: new Date() }), false);
  });
  it("A->B and B->A share one conversation key (no duplicates)", () => assert.equal(pairKeyFor("a", "b"), pairKeyFor("b", "a")));
});

describe("send validation", () => {
  it("trims, normalises line endings and keeps inner newlines", () => {
    const r = sendMessageSchema.parse({ content: "  hi\r\nthere  " });
    assert.equal(r.content, "hi\nthere");
  });
  it("rejects empty and whitespace-only messages", () => {
    assert.equal(sendMessageSchema.safeParse({ content: "   \n " }).success, false);
    assert.equal(sendMessageSchema.safeParse({}).success, false);
  });
  it("rejects over-long messages", () => assert.equal(sendMessageSchema.safeParse({ content: "x".repeat(2001) }).success, false));
  it("strips NUL bytes that PostgreSQL cannot store", () => assert.equal(sendMessageSchema.parse({ content: "a\u0000b" }).content, "ab"));
  it("ignores a senderId smuggled into the body", () => {
    const r = sendMessageSchema.parse({ content: "hi", senderId: "victim" });
    assert.equal("senderId" in r, false);
  });
  it("validates the client id shape", () => {
    assert.equal(sendMessageSchema.safeParse({ content: "hi", clientId: "short" }).success, false);
    assert.equal(sendMessageSchema.safeParse({ content: "hi", clientId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" }).success, true);
  });
  it("page query falls back to safe defaults", () => {
    const q = messagePageQuerySchema.parse({ limit: "9999" });
    assert.equal(q.limit, 30);
    assert.equal(q.before, undefined);
  });
});

describe("rate limits", () => {
  beforeEach(() => resetRateLimits());
  it("caps message bursts", () => {
    for (let i = 0; i < 20; i++) enforceRateLimit("u", "sendMessageBurst");
    assert.throws(() => enforceRateLimit("u", "sendMessageBurst"), /limit/);
  });
  it("caps new conversations per user, not globally", () => {
    for (let i = 0; i < 30; i++) enforceRateLimit("u", "startConversation");
    assert.throws(() => enforceRateLimit("u", "startConversation"));
    assert.doesNotThrow(() => enforceRateLimit("other", "startConversation"));
  });
});

const msg = (id: string, createdAt: string, extra: Partial<LocalMessage> = {}): LocalMessage => ({
  id, conversationId: "c", senderId: "x", mine: false, content: id, createdAt, editedAt: null, replyTo: null, reactions: [], readAt: null, deleted: false, clientId: null, ...extra,
});

describe("thread merging", () => {
  it("orders by time and lets the server version win (deletes, seen)", () => {
    const local = [msg("m1", "2026-10-04T10:00:00Z"), msg("m2", "2026-10-04T10:01:00Z")];
    const merged = mergeMessages(local, [msg("m2", "2026-10-04T10:01:00Z", { deleted: true, content: "" }), msg("m0", "2026-10-04T09:59:00Z")]);
    assert.deepEqual(merged.map((m) => m.id), ["m0", "m1", "m2"]);
    assert.equal(merged[2].deleted, true);
  });
  it("replaces a pending message with its saved copy (no duplicate bubble)", () => {
    const pending = msg("pending-abc", "2026-10-04T10:00:00Z", { mine: true, clientId: "abc12345", status: "sending" });
    const saved = msg("m9", "2026-10-04T10:00:01Z", { mine: true, clientId: "abc12345" }) as MessageDTO;
    const merged = mergeMessages([pending], [saved]);
    assert.deepEqual(merged.map((m) => m.id), ["m9"]);
  });
  it("keeps pending/failed messages at the end", () => {
    const pending = msg("pending-z", "2026-10-04T09:00:00Z", { mine: true, clientId: "zzzzzzzz", status: "failed" });
    const merged = mergeMessages([pending], [msg("m1", "2026-10-04T10:00:00Z")]);
    assert.deepEqual(merged.map((m) => m.id), ["m1", "pending-z"]);
  });
});

describe("thread layout", () => {
  const now = new Date("2026-10-04T12:00:00");
  it("adds day separators and groups quick runs from one sender", () => {
    const rows = buildThread(
      [
        msg("a", "2026-10-03T10:00:00", { mine: false }),
        msg("b", "2026-10-04T10:00:00", { mine: true }),
        msg("c", "2026-10-04T10:01:00", { mine: true }),
        msg("d", "2026-10-04T10:30:00", { mine: true }),
      ],
      now,
    );
    assert.deepEqual(rows.map((r) => (r.kind === "day" ? `day:${r.label}` : r.key)), ["day:Yesterday", "a", "day:Today", "b", "c", "d"]);
    const flags = Object.fromEntries(rows.flatMap((r) => (r.kind === "message" ? [[r.key, [r.first, r.last]]] : [])));
    assert.deepEqual(flags.b, [true, false]);
    assert.deepEqual(flags.c, [false, true]);
    assert.deepEqual(flags.d, [true, true]);
  });
  it("labels days", () => {
    assert.equal(dayLabel("2026-10-04T01:00:00", now), "Today");
    assert.equal(dayLabel("2026-10-03T23:00:00", now), "Yesterday");
  });
  it("shortens previews", () => {
    assert.equal(previewText("  hello \n\n world  "), "hello world");
    assert.ok(previewText("x".repeat(500), 50).length <= 50);
  });
  it("sums unread", () => assert.equal(totalUnread([{ unread: 2 }, { unread: 0 }, { unread: 3 }]), 5));
});

describe("message notifications", () => {
  it("open the right conversation", () => {
    assert.equal(notificationHref({ type: "MESSAGE", postId: null, jobId: null, actorId: "u", conversationId: "conv1" }), "/messages/conv1");
    assert.equal(notificationHref({ type: "MESSAGE", postId: null, jobId: null, actorId: "u" }), "/messages");
  });
});

// ───────── v2: reactions, menu rules, presence, notification privacy ─────────
import { applyMyReaction, messageActions } from "@/lib/messaging/thread";
import { presenceLabel, toPresence } from "@/lib/presence";
import { deleteScopeSchema, editMessageSchema } from "@/lib/validations/message";

describe("message reactions (optimistic)", () => {
  it("adds, switches and removes my single reaction", () => {
    let r = applyMyReaction([], "LIKE");
    assert.deepEqual(r, [{ type: "LIKE", count: 1, mine: true }]);
    r = applyMyReaction(r, "CELEBRATE");
    assert.deepEqual(r, [{ type: "CELEBRATE", count: 1, mine: true }]);
    assert.deepEqual(applyMyReaction(r, null), []);
  });
  it("keeps other people's reactions", () => {
    const r = applyMyReaction([{ type: "LIKE", count: 2, mine: true }], null);
    assert.deepEqual(r, [{ type: "LIKE", count: 1, mine: false }]);
  });
});

describe("message menu shows only valid actions", () => {
  it("own message: everything", () => assert.deepEqual(messageActions({ mine: true, deleted: false }), { react: true, reply: true, copy: true, edit: true, deleteForMe: true, deleteForEveryone: true }));
  it("someone else's message: no edit, no delete-for-everyone", () => {
    const a = messageActions({ mine: false, deleted: false });
    assert.equal(a.edit, false);
    assert.equal(a.deleteForEveryone, false);
    assert.equal(a.deleteForMe, true);
  });
  it("deleted message: only delete-for-me", () => {
    const a = messageActions({ mine: true, deleted: true });
    assert.deepEqual(Object.entries(a).filter(([, v]) => v).map(([k]) => k), ["deleteForMe"]);
  });
  it("unsent message: nothing", () => assert.equal(Object.values(messageActions({ mine: true, deleted: false, status: "sending" })).some(Boolean), false));
});

describe("message validation", () => {
  it("edit rejects empty content", () => assert.equal(editMessageSchema.safeParse({ content: "  " }).success, false));
  it("delete scope defaults to everyone only for garbage, accepts me", () => {
    assert.equal(deleteScopeSchema.parse("me"), "me");
    assert.equal(deleteScopeSchema.parse("whatever"), "everyone");
  });
});

describe("presence privacy", () => {
  const now = Date.now();
  const seen = (msAgo: number) => new Date(now - msAgo);
  it("online within 2 minutes, then last-active", () => {
    const on = toPresence({ viewerShares: true, targetShares: true, lastSeenAt: seen(30_000) }, now);
    assert.equal(presenceLabel(on, "precise", now), "Online");
    const off = toPresence({ viewerShares: true, targetShares: true, lastSeenAt: seen(8 * 60_000) }, now);
    assert.equal(presenceLabel(off, "precise", now), "Last active 8m ago");
  });
  it("hidden if EITHER side turned the switch off", () => {
    assert.equal(toPresence({ viewerShares: false, targetShares: true, lastSeenAt: seen(1000) }, now).visible, false);
    assert.equal(toPresence({ viewerShares: true, targetShares: false, lastSeenAt: seen(1000) }, now).visible, false);
  });
  it("hidden when never seen", () => assert.equal(toPresence({ viewerShares: true, targetShares: true, lastSeenAt: null }, now).visible, false));
  it("profile wording is coarse and stops after a day", () => {
    const recent = toPresence({ viewerShares: true, targetShares: true, lastSeenAt: seen(3 * 3_600_000) }, now);
    assert.equal(presenceLabel(recent, "coarse", now), "Last active recently");
    const old = toPresence({ viewerShares: true, targetShares: true, lastSeenAt: seen(3 * 86_400_000) }, now);
    assert.equal(presenceLabel(old, "coarse", now), null);
  });
});

describe("notifications never contain message content", () => {
  it("the MESSAGE notification text is fixed", async () => {
    const { NOTIFICATION_TEXT } = await import("@/services/social/notification.service");
    assert.equal(NOTIFICATION_TEXT.MESSAGE, "sent you a message");
  });
});
