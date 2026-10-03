import type { EmploymentType, ExperienceLevel, NotificationType, PostType, PostVisibility, ReactionType, WorkArrangement } from "@prisma/client";

/** Everything below is plain JSON-serialisable data, safe to pass from server to client components and API responses. */

export type Relationship = "self" | "connection" | "following" | "none";

export type AuthorDTO = {
  id: string;
  name: string;
  headline: string | null;
  avatarUrl: string | null;
  relationship: Relationship;
};

export type JobSummaryDTO = {
  id: string;
  title: string;
  company: string;
  location: string;
  workArrangement: WorkArrangement;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  postedAt: string;
  skills: string[];
  /** Internal recommendation indicator (0-100). Not a guarantee of fit. */
  match: number | null;
  matchLabel: string | null;
  reasons: string[];
  saved: boolean;
};

export type PostMediaDTO = { url: string; width: number | null; height: number | null; alt: string | null };

export type SharedPostDTO =
  | { available: true; id: string; author: AuthorDTO; content: string | null; title: string | null; postType: PostType; createdAt: string; media: PostMediaDTO[] }
  | { available: false };

export type PostDTO = {
  id: string;
  content: string | null;
  postType: PostType;
  visibility: PostVisibility;
  title: string | null;
  linkUrl: string | null;
  linkHost: string | null;
  createdAt: string;
  editedAt: string | null;
  author: AuthorDTO;
  media: PostMediaDTO[];
  job: (Omit<JobSummaryDTO, "match" | "matchLabel" | "reasons" | "saved"> & { isActive: boolean }) | null;
  shared: SharedPostDTO | null;
  counts: { reactions: number; comments: number; shares: number; byType: Partial<Record<ReactionType, number>> };
  viewer: { reaction: ReactionType | null; saved: boolean; isAuthor: boolean };
};

export type CommentDTO = {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  author: AuthorDTO;
  reactionCount: number;
  replyCount: number;
  viewer: { reaction: ReactionType | null; canDelete: boolean };
  replies: CommentDTO[];
};

export type InsightDTO = { title: string; text: string; href: string | null; cta: string | null };

export type FeedItemDTO =
  | { kind: "post"; key: string; post: PostDTO }
  | { kind: "job"; key: string; job: JobSummaryDTO }
  | { kind: "insight"; key: string; insight: InsightDTO };

export type FeedPageDTO = { items: FeedItemDTO[]; nextCursor: string | null; hasMore: boolean };

export type NotificationDTO = {
  id: string;
  type: NotificationType;
  text: string;
  href: string;
  actor: { id: string; name: string; avatarUrl: string | null } | null;
  read: boolean;
  createdAt: string;
};

import type { toJobDetailDTO } from "./mappers";
export type JobDetailDTO = ReturnType<typeof toJobDetailDTO>;
