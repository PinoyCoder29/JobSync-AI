import type { PostVisibility, ReactionType } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { canDeletePost, canEditPost, canSharePost, canViewPost } from "@/lib/permissions/post";
import { enforceRateLimit } from "@/lib/rate-limit";
import { MAX_POST_IMAGES, type CreatePostInput } from "@/lib/validations/post";
import { connectionRepository, blockRepository } from "@/repositories/networking.repository";
import { postRepository, type PostRecord } from "@/repositories/post.repository";
import { mediaService } from "@/services/media/media.service";
import { getJobProvider } from "@/services/job-provider.service";
import { toAuthor, toPostDTO, type RelationshipLookup } from "./mappers";
import { notificationService } from "./notification.service";
import type { PostDTO, Relationship } from "./types";

/** The same answer for "missing", "blocked" and "not allowed", so private content and blocks are never revealed. */
const NOT_FOUND = "This post isn't available.";

export type PostAccess = NonNullable<Awaited<ReturnType<typeof postRepository.findAccessInfo>>>;

/** Loads a post's access info and enforces visibility + blocking on the server. Throws NOT_FOUND when not allowed. */
export async function requireViewablePost(viewerId: string | null, postId: string): Promise<PostAccess> {
  const post = await postRepository.findAccessInfo(postId);
  if (!post) throw new AppError(NOT_FOUND, "NOT_FOUND");
  if (viewerId === post.authorId) return post;

  const [connection, blocked] = await Promise.all([
    viewerId ? connectionRepository.findBetween(viewerId, post.authorId) : Promise.resolve(null),
    viewerId ? blockRepository.isBlockedEitherWay(viewerId, post.authorId) : Promise.resolve(false),
  ]);
  const allowed = canViewPost({ viewerId, authorId: post.authorId, visibility: post.visibility, connected: connection?.status === "ACCEPTED", blocked });
  if (!allowed) throw new AppError(NOT_FOUND, "NOT_FOUND");
  return post;
}

/** Turns database rows into DTOs, adding relationship labels and reaction breakdowns with two grouped queries (no N+1). */
export async function hydratePosts(records: PostRecord[], viewerId: string | null): Promise<PostDTO[]> {
  if (records.length === 0) return [];
  const authorIds = [...new Set(records.flatMap((r) => [r.authorId, ...(r.sharedPost ? [r.sharedPost.authorId] : [])]))];
  const [connected, following, breakdown] = await Promise.all([
    viewerId ? postRepository.connectedAmong(viewerId, authorIds) : Promise.resolve(new Set<string>()),
    viewerId ? postRepository.followedAmong(viewerId, authorIds) : Promise.resolve(new Set<string>()),
    postRepository.reactionBreakdown(records.map((r) => r.id)),
  ]);
  const relationshipOf: RelationshipLookup = (id): Relationship =>
    id === viewerId ? "self" : connected.has(id) ? "connection" : following.has(id) ? "following" : "none";
  return records.map((r) => toPostDTO(r, viewerId, relationshipOf, breakdown.get(r.id)));
}

export const postService = {
  async create(userId: string, input: CreatePostInput, files: File[]): Promise<PostDTO> {
    enforceRateLimit(userId, "createPost");
    if (files.length > MAX_POST_IMAGES) throw new AppError(`You can add up to ${MAX_POST_IMAGES} images.`);

    let postType = input.postType;
    if (files.length > 0 && postType === "TEXT") postType = "IMAGE";
    if (postType === "IMAGE" && files.length === 0) throw new AppError("Add at least one image.");
    if (postType === "TEXT" && !input.content) throw new AppError("Write something to share.");
    if (!input.content && !input.title && files.length === 0 && !input.jobId && !input.linkUrl) throw new AppError("Write something to share.");

    if (input.jobId) {
      // only a real, active job can be attached: nothing is fabricated
      const job = await getJobProvider().getById(input.jobId);
      if (!job) throw new AppError("That job is no longer available.", "NOT_FOUND");
    }

    if (files.length > 0) enforceRateLimit(userId, "postWithImages");
    const uploaded = await mediaService.uploadPostImages(userId, files);

    try {
      const created = await postRepository.create({
        authorId: userId,
        content: input.content,
        postType,
        visibility: input.visibility,
        title: input.title,
        linkUrl: input.linkUrl,
        jobId: input.jobId,
        media: uploaded.map((a) => ({ url: a.url, publicId: a.publicId, mimeType: a.mimeType, width: a.width, height: a.height, bytes: a.bytes, resourceType: a.resourceType })),
      });
      return (await this.get(userId, created.id))!;
    } catch (error) {
      await mediaService.deleteAssets(uploaded.map((a) => a.publicId)); // nothing orphaned on Cloudinary
      throw error;
    }
  },

  async get(viewerId: string | null, postId: string): Promise<PostDTO | null> {
    await requireViewablePost(viewerId, postId);
    const record = await postRepository.findById(postId, viewerId);
    if (!record) return null;
    return (await hydratePosts([record], viewerId))[0];
  },

  async update(userId: string, postId: string, input: { content?: string; title?: string; visibility?: PostVisibility }): Promise<PostDTO> {
    const post = await postRepository.findAccessInfo(postId);
    if (!post || !canEditPost(userId, post.authorId)) throw new AppError(NOT_FOUND, "NOT_FOUND"); // not yours = not found
    if (input.content === undefined && input.title === undefined && input.visibility === undefined) throw new AppError("Nothing to change.");
    if (post.postType === "TEXT" && input.content === undefined && input.visibility === undefined) throw new AppError("Nothing to change.");
    const ok = await postRepository.updateOwned(postId, userId, {
      ...(input.content !== undefined ? { content: input.content || null } : {}),
      ...(input.title !== undefined ? { title: input.title || null } : {}),
      ...(input.visibility ? { visibility: input.visibility } : {}),
    });
    if (!ok) throw new AppError(NOT_FOUND, "NOT_FOUND");
    return (await this.get(userId, postId))!;
  },

  async delete(userId: string, postId: string): Promise<void> {
    const post = await postRepository.findAccessInfo(postId);
    if (!post || !canDeletePost(userId, post.authorId)) throw new AppError(NOT_FOUND, "NOT_FOUND");
    const publicIds = await postRepository.deleteOwned(postId, userId);
    if (publicIds === null) throw new AppError(NOT_FOUND, "NOT_FOUND");
    if (publicIds.length) mediaService.deleteAssets(publicIds).catch((e) => console.error("Cloudinary cleanup failed", e));
  },

  // ───────── reactions ─────────

  /**
   * "People who reacted": anyone who may VIEW the post may see who reacted to it (same rule as the post itself).
   * Names/avatars/headlines go through toAuthor(), so private profiles show only a name.
   */
  async listReactors(viewerId: string | null, postId: string, opts: { type?: ReactionType; cursor?: string }) {
    await requireViewablePost(viewerId, postId);
    const hiddenIds = viewerId ? [...(await blockRepository.hiddenUserIds(viewerId))] : [];
    const page = await postRepository.listReactors({ postId, hiddenIds, type: opts.type, cursor: opts.cursor, take: 20 });
    const ids = page.items.map((r) => r.user.id);
    const [connected, following] = await Promise.all([
      viewerId ? postRepository.connectedAmong(viewerId, ids) : Promise.resolve(new Set<string>()),
      viewerId ? postRepository.followedAmong(viewerId, ids) : Promise.resolve(new Set<string>()),
    ]);
    const rel = (id: string): Relationship => (id === viewerId ? "self" : connected.has(id) ? "connection" : following.has(id) ? "following" : "none");
    return {
      items: page.items.map((r) => ({ id: r.id, type: r.type, person: toAuthor(r.user, rel(r.user.id)) })),
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    };
  },

  async react(userId: string, postId: string, type: ReactionType) {
    const post = await requireViewablePost(userId, postId);
    enforceRateLimit(userId, "reaction");
    await postRepository.setReaction(postId, userId, type); // one row per user+post; changing type updates it
    notificationService.notify({ recipientId: post.authorId, actorId: userId, type: "POST_REACTION", postId });
    return this.reactionState(postId, type);
  },

  async unreact(userId: string, postId: string) {
    await requireViewablePost(userId, postId);
    await postRepository.removeReaction(postId, userId);
    return this.reactionState(postId, null);
  },

  async reactionState(postId: string, mine: ReactionType | null) {
    const rows = await postRepository.reactionSummary(postId);
    const byType: Partial<Record<ReactionType, number>> = {};
    let total = 0;
    for (const r of rows) {
      byType[r.type] = r._count._all;
      total += r._count._all;
    }
    return { reaction: mine, total, byType };
  },

  // ───────── share / save / report ─────────

  async share(userId: string, postId: string, input: { content?: string; visibility: PostVisibility }): Promise<PostDTO> {
    let target = await requireViewablePost(userId, postId);
    // Sharing a share shares the original, so chains never nest.
    if (target.sharedPostId) target = await requireViewablePost(userId, target.sharedPostId);
    if (!canSharePost(target.visibility)) throw new AppError("Only public posts can be shared.", "FORBIDDEN");
    enforceRateLimit(userId, "share");

    const created = await postRepository.create({ authorId: userId, content: input.content, postType: "TEXT", visibility: input.visibility, sharedPostId: target.id });
    notificationService.notify({ recipientId: target.authorId, actorId: userId, type: "POST_SHARED", postId: target.id });
    return (await this.get(userId, created.id))!;
  },

  async save(userId: string, postId: string) {
    await requireViewablePost(userId, postId);
    enforceRateLimit(userId, "save");
    await postRepository.savePost(userId, postId);
    return { saved: true };
  },

  async unsave(userId: string, postId: string) {
    await postRepository.unsavePost(userId, postId);
    return { saved: false };
  },

  async report(userId: string, postId: string, input: { reason: string; details?: string }) {
    const post = await requireViewablePost(userId, postId);
    if (post.authorId === userId) throw new AppError("You can't report your own post.");
    enforceRateLimit(userId, "report");
    if (await postRepository.findReport(userId, { postId })) throw new AppError("You've already reported this post.", "CONFLICT");
    await postRepository.createReport({ reporterId: userId, targetType: "POST", postId, reason: input.reason, details: input.details });
    return { reported: true };
  },

  async listSaved(userId: string, cursor?: string, take = 10) {
    const page = await postRepository.listSavedIds(userId, cursor, take);
    const records = await postRepository.findByIds(page.items.map((i) => i.postId), userId);
    const byId = new Map(records.map((r) => [r.id, r]));
    // keep saved order; drop posts the user can no longer see (deleted, now restricted, author blocked)
    const hidden = await blockRepository.hiddenUserIds(userId);
    const visible: PostRecord[] = [];
    for (const item of page.items) {
      const r = byId.get(item.postId);
      if (!r || hidden.has(r.authorId)) continue;
      const ok = r.authorId === userId || r.visibility === "PUBLIC" || (r.visibility === "CONNECTIONS_ONLY" && (await postRepository.connectedAmong(userId, [r.authorId])).has(r.authorId));
      if (ok) visible.push(r);
    }
    return { items: await hydratePosts(visible, userId), hasMore: page.hasMore, nextCursor: page.nextCursor };
  },
};
