import { effectiveVisibility } from "@/lib/permissions/profile";
import { getOptimizedUrl } from "@/lib/storage/cloudinary";
import { safeHttpUrl } from "@/lib/safe-url";
import type { CommentRecord, CommentWithReplies } from "@/repositories/comment.repository";
import type { PostRecord } from "@/repositories/post.repository";
import type { JobListItem } from "@/types";
import type { AuthorDTO, CommentDTO, JobSummaryDTO, PostDTO, PostMediaDTO, Relationship, SharedPostDTO } from "./types";
import type { ReactionType } from "@prisma/client";

type AuthorRecord = PostRecord["author"];

/** Private profiles are reduced to a name and initial: no headline, no photo. */
export function toAuthor(author: AuthorRecord, relationship: Relationship): AuthorDTO {
  const showDetails = effectiveVisibility(author.profile) !== "PRIVATE" || relationship === "self";
  const avatar = author.profile?.avatarMedia?.url;
  return {
    id: author.id,
    name: author.name?.trim() || "JobSync member",
    headline: showDetails ? author.profile?.headline ?? null : null,
    avatarUrl: showDetails ? (avatar ? getOptimizedUrl(avatar, "avatar") : author.image ?? null) : null,
    relationship,
  };
}

const toMedia = (media: PostRecord["media"]): PostMediaDTO[] =>
  media.map((m) => ({ url: getOptimizedUrl(m.media.url, "feed"), width: m.media.width, height: m.media.height, alt: m.alt }));

export type RelationshipLookup = (userId: string) => Relationship;

export function toPostDTO(
  post: PostRecord,
  viewerId: string | null,
  relationshipOf: RelationshipLookup,
  byType: Partial<Record<ReactionType, number>> = {},
): PostDTO {
  const link = safeHttpUrl(post.linkUrl);

  let shared: SharedPostDTO | null = null;
  if (post.sharedPostId) {
    const s = post.sharedPost;
    // A share only ever shows its original while the original is still public (or the viewer's own).
    // If the original became restricted or was removed, the share shows a neutral placeholder.
    const visible = s && (s.visibility === "PUBLIC" || s.authorId === viewerId);
    shared = visible
      ? { available: true, id: s.id, author: toAuthor(s.author, relationshipOf(s.authorId)), content: s.content, title: s.title, postType: s.postType, createdAt: s.createdAt.toISOString(), media: toMedia(s.media) }
      : { available: false };
  }

  return {
    id: post.id,
    content: post.content,
    postType: post.postType,
    visibility: post.visibility,
    title: post.title,
    linkUrl: link,
    linkHost: link ? new URL(link).hostname.replace(/^www\./, "") : null,
    createdAt: post.createdAt.toISOString(),
    editedAt: post.editedAt?.toISOString() ?? null,
    author: toAuthor(post.author, relationshipOf(post.authorId)),
    media: toMedia(post.media),
    job: post.job
      ? {
          id: post.job.id,
          title: post.job.title,
          company: post.job.company,
          location: post.job.location,
          workArrangement: post.job.workArrangement,
          employmentType: post.job.employmentType,
          experienceLevel: post.job.experienceLevel,
          salaryMin: post.job.salaryMin,
          salaryMax: post.job.salaryMax,
          currency: post.job.currency,
          postedAt: post.job.postedAt.toISOString(),
          skills: post.job.skills.map((s) => s.skill.name),
          isActive: post.job.isActive,
        }
      : null,
    shared,
    counts: { reactions: post._count.reactions, comments: post._count.comments, shares: post._count.shares, byType },
    viewer: { reaction: post.reactions[0]?.type ?? null, saved: post.savedBy.length > 0, isAuthor: viewerId === post.authorId },
  };
}

export function toCommentDTO(c: CommentRecord, viewerId: string | null, postAuthorId: string, relationshipOf: RelationshipLookup): CommentDTO {
  return {
    id: c.id,
    postId: c.postId,
    parentId: c.parentId,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    editedAt: c.editedAt?.toISOString() ?? null,
    author: toAuthor(c.author, relationshipOf(c.authorId)),
    reactionCount: c._count.reactions,
    replyCount: c._count.replies,
    viewer: { reaction: c.reactions[0]?.type ?? null, canDelete: viewerId !== null && (viewerId === c.authorId || viewerId === postAuthorId), canEdit: viewerId !== null && viewerId === c.authorId },
    replies: [],
  };
}

export function toCommentTree(c: CommentWithReplies, viewerId: string | null, postAuthorId: string, relationshipOf: RelationshipLookup): CommentDTO {
  return { ...toCommentDTO(c, viewerId, postAuthorId, relationshipOf), replies: c.replies.map((r) => toCommentDTO(r, viewerId, postAuthorId, relationshipOf)) };
}

export function toJobSummary(item: JobListItem): JobSummaryDTO {
  return {
    id: item.id,
    title: item.title,
    company: item.company,
    location: item.location,
    workArrangement: item.workArrangement,
    employmentType: item.employmentType,
    experienceLevel: item.experienceLevel,
    salaryMin: item.salaryMin,
    salaryMax: item.salaryMax,
    currency: item.currency,
    postedAt: item.postedAt.toISOString(),
    skills: item.skills.map((s) => s.skill.name),
    match: item.match,
    matchLabel: item.matchLabel ?? null,
    reasons: item.reasons ?? [],
    saved: item.saved,
  };
}

import type { jobService } from "@/services/job.service";

type JobDetailResult = NonNullable<Awaited<ReturnType<typeof jobService.detail>>>;

/** Public job fields only. Company is the plain-text name on Job: no recruiter or private company data is exposed. */
export function toJobDetailDTO(d: JobDetailResult) {
  const j = d.job;
  return {
    job: {
      id: j.id,
      title: j.title,
      company: j.company,
      location: j.location,
      workArrangement: j.workArrangement,
      employmentType: j.employmentType,
      experienceLevel: j.experienceLevel,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      currency: j.currency,
      description: j.description,
      postedAt: j.postedAt.toISOString(),
      companyDescription: j.companyDescription,
      responsibilities: j.responsibilities,
      requirements: j.requirements,
      preferred: j.preferred,
      benefits: j.benefits,
      skills: j.skills.map((s) => ({ name: s.skill.name, required: s.required })),
    },
    saved: d.saved,
    application: d.application ? { id: d.application.id, status: d.application.status } : null,
    match: d.recommendation ? { score: d.recommendation.score, label: d.recommendation.label, reasons: d.recommendation.reasons } : null,
  };
}
