import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canDeleteComment, canDeletePost, canEditPost, canSharePost, canViewPost, validReplyParent } from "@/lib/permissions/post";
import { interleave, rankFeed, scorePost, type RankInput } from "@/lib/recommendations/feed-ranking";
import { commentSchema, createPostSchema, reactionSchema, updatePostSchema } from "@/lib/validations/post";
import { relativeTime } from "@/lib/time";

describe("post visibility", () => {
  const base = { viewerId: "viewer", authorId: "author", connected: false, blocked: false };
  it("public posts are visible to anyone, even signed out", () => {
    assert.equal(canViewPost({ ...base, visibility: "PUBLIC" }), true);
    assert.equal(canViewPost({ ...base, viewerId: null, visibility: "PUBLIC" }), true);
  });
  it("connections-only needs an accepted connection", () => {
    assert.equal(canViewPost({ ...base, visibility: "CONNECTIONS_ONLY" }), false);
    assert.equal(canViewPost({ ...base, visibility: "CONNECTIONS_ONLY", connected: true }), true);
    assert.equal(canViewPost({ ...base, viewerId: null, visibility: "CONNECTIONS_ONLY", connected: true }), false);
  });
  it("private posts are only visible to the author", () => {
    assert.equal(canViewPost({ ...base, visibility: "PRIVATE", connected: true }), false);
    assert.equal(canViewPost({ ...base, viewerId: "author", visibility: "PRIVATE" }), true);
  });
  it("a block hides even public posts, in both directions", () => {
    assert.equal(canViewPost({ ...base, visibility: "PUBLIC", blocked: true }), false);
    assert.equal(canViewPost({ ...base, visibility: "CONNECTIONS_ONLY", connected: true, blocked: true }), false);
  });
});

describe("post ownership", () => {
  it("only the author can edit or delete a post", () => {
    assert.equal(canEditPost("a", "a"), true);
    assert.equal(canEditPost("b", "a"), false);
    assert.equal(canDeletePost("b", "a"), false);
  });
  it("comment authors and the post owner can delete a comment, nobody else", () => {
    assert.equal(canDeleteComment("c", "c", "p"), true);
    assert.equal(canDeleteComment("p", "c", "p"), true);
    assert.equal(canDeleteComment("x", "c", "p"), false);
  });
  it("only public posts can be shared", () => {
    assert.equal(canSharePost("PUBLIC"), true);
    assert.equal(canSharePost("CONNECTIONS_ONLY"), false);
    assert.equal(canSharePost("PRIVATE"), false);
  });
});

describe("comment nesting", () => {
  it("allows replying to a top-level comment on the same post", () => assert.equal(validReplyParent({ postId: "p1", parentId: null }, "p1"), true));
  it("rejects replies to replies (one level only)", () => assert.equal(validReplyParent({ postId: "p1", parentId: "c1" }, "p1"), false));
  it("rejects a parent from another post or a missing parent", () => {
    assert.equal(validReplyParent({ postId: "p2", parentId: null }, "p1"), false);
    assert.equal(validReplyParent(null, "p1"), false);
  });
});

describe("post validation", () => {
  it("accepts a plain text post and defaults to PUBLIC / TEXT", () => {
    const r = createPostSchema.parse({ content: "  Hello world  " });
    assert.equal(r.content, "Hello world");
    assert.equal(r.visibility, "PUBLIC");
    assert.equal(r.postType, "TEXT");
  });
  it("rejects unsafe links instead of storing them", () => {
    assert.equal(createPostSchema.safeParse({ postType: "LINK", linkUrl: "javascript:alert(1)" }).success, false);
    assert.equal(createPostSchema.safeParse({ postType: "LINK", linkUrl: "data:text/html,<script>" }).success, false);
    assert.equal(createPostSchema.parse({ postType: "LINK", linkUrl: "https://example.com/a" }).linkUrl, "https://example.com/a");
  });
  it("requires a job for JOB posts, a link for LINK posts and a name for PROJECT posts", () => {
    assert.equal(createPostSchema.safeParse({ postType: "JOB" }).success, false);
    assert.equal(createPostSchema.safeParse({ postType: "LINK" }).success, false);
    assert.equal(createPostSchema.safeParse({ postType: "PROJECT", content: "x" }).success, false);
    assert.equal(createPostSchema.safeParse({ postType: "PROJECT", title: "JobSync" }).success, true);
  });
  it("rejects unknown post types, visibilities and reactions", () => {
    assert.equal(createPostSchema.safeParse({ content: "x", postType: "POLL" }).success, false);
    assert.equal(createPostSchema.safeParse({ content: "x", visibility: "EVERYONE" }).success, false);
    assert.equal(reactionSchema.safeParse({ type: "HATE" }).success, false);
    assert.equal(reactionSchema.parse({}).type, "LIKE");
  });
  it("strips control characters and enforces length limits", () => {
    assert.equal(createPostSchema.parse({ content: "a\u0000b\u0007c" }).content, "abc");
    assert.equal(createPostSchema.safeParse({ content: "x".repeat(3001) }).success, false);
    assert.equal(commentSchema.safeParse({ content: "   " }).success, false);
    assert.equal(commentSchema.safeParse({ content: "x".repeat(1501) }).success, false);
  });
  it("never lets the client set the author", () => {
    const parsed = createPostSchema.parse({ content: "x", authorId: "someone-else" } as never);
    assert.equal("authorId" in parsed, false);
    assert.equal("authorId" in updatePostSchema.parse({ content: "x", authorId: "z" } as never), false);
  });
});

describe("feed ranking", () => {
  const now = Date.parse("2026-10-03T12:00:00Z");
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000);
  const post = (over: Partial<RankInput>): RankInput => ({ id: "p", createdAt: hoursAgo(1), relationship: "none", reactions: 0, comments: 0, shares: 0, sharedSkills: 0, postType: "TEXT", jobMatch: null, ...over });

  it("ranks closer relationships and fresher posts higher", () => {
    assert.ok(scorePost(post({ relationship: "connection" }), now).total > scorePost(post({ relationship: "none" }), now).total);
    assert.ok(scorePost(post({ createdAt: hoursAgo(1) }), now).total > scorePost(post({ createdAt: hoursAgo(100) }), now).total);
  });
  it("engagement helps but is capped so a viral stranger can't bury a connection", () => {
    const viral = scorePost(post({ reactions: 1_000_000 }), now);
    assert.ok(viral.engagement <= 18);
    assert.ok(scorePost(post({ relationship: "connection" }), now).total > viral.total - 1);
  });
  it("job relevance and shared skills raise a post's score", () => {
    assert.ok(scorePost(post({ jobMatch: 90 }), now).total > scorePost(post({ jobMatch: null }), now).total);
    assert.ok(scorePost(post({ sharedSkills: 3 }), now).careerRelevance > 0);
  });
  it("is stable for equal scores and never drops items", () => {
    const items = ["a", "b", "c"].map((id) => post({ id }));
    assert.deepEqual(rankFeed(items, now).map((i) => i.id), ["a", "b", "c"]);
    assert.equal(rankFeed([], now).length, 0);
  });
});

describe("feed interleaving", () => {
  const posts = Array.from({ length: 8 }, (_, i) => `post-${i}`);
  it("keeps every post in order and mixes in job and insight cards", () => {
    const out = interleave(posts, ["job-a", "job-b", "job-c"], "insight");
    assert.deepEqual(out.filter((e) => e.kind === "post").map((e) => (e as { post: string }).post), posts);
    assert.ok(out.some((e) => e.kind === "job"));
    assert.equal(out.filter((e) => e.kind === "insight").length, 1);
    assert.equal(out[0].kind, "post");
  });
  it("does not make every item a job", () => {
    const out = interleave(posts, ["a", "b", "c", "d", "e"], null);
    assert.ok(out.filter((e) => e.kind === "job").length <= 3);
  });
  it("still shows recommendations when there are no posts, and nothing when there is nothing", () => {
    assert.equal(interleave([], ["a", "b", "c"], null).filter((e) => e.kind === "job").length, 2);
    assert.equal(interleave([], [], null).length, 0);
  });
});

describe("relative time", () => {
  const now = Date.parse("2026-10-03T12:00:00Z");
  it("formats minutes, hours and days", () => {
    assert.equal(relativeTime(new Date(now - 10_000), now), "now");
    assert.equal(relativeTime(new Date(now - 5 * 60_000), now), "5m");
    assert.equal(relativeTime(new Date(now - 2 * 3_600_000), now), "2h");
    assert.equal(relativeTime(new Date(now - 3 * 86_400_000), now), "3d");
  });
});
