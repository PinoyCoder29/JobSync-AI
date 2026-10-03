import type {
  ApplicationStatus, Difficulty, EmploymentType, ExperienceLevel, InterviewCategory, WorkArrangement,
} from "@prisma/client";

export const ARRANGEMENT_LABEL: Record<WorkArrangement, string> = { ONSITE: "On-site", HYBRID: "Hybrid", REMOTE: "Remote" };
export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract", INTERNSHIP: "Internship",
};
export const LEVEL_LABEL: Record<ExperienceLevel, string> = { ENTRY: "Entry level", JUNIOR: "Junior", MID: "Mid level", SENIOR: "Senior" };
export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPLIED: "Applied", SCREENING: "Screening", ASSESSMENT: "Assessment", INTERVIEW: "Interview",
  OFFER: "Offer", REJECTED: "Rejected", WITHDRAWN: "Withdrawn",
};
export const PIPELINE: ApplicationStatus[] = ["APPLIED", "SCREENING", "ASSESSMENT", "INTERVIEW", "OFFER"];
export const CATEGORY_LABEL: Record<InterviewCategory, string> = {
  HR: "HR", BEHAVIORAL: "Behavioral", TECHNICAL: "Technical", SITUATIONAL: "Situational",
};
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" };

export function keysOf<T extends string>(record: Record<T, string>): T[] {
  return Object.keys(record) as T[];
}

export function formatSalary(min: number | null, max: number | null, currency = "PHP"): string {
  const symbol = currency === "PHP" ? "₱" : `${currency} `;
  const fmt = (n: number) => n.toLocaleString("en-US");
  if (min && max) return `${symbol}${fmt(min)} – ${symbol}${fmt(max)}`;
  if (min) return `From ${symbol}${fmt(min)}`;
  if (max) return `Up to ${symbol}${fmt(max)}`;
  return "Salary not disclosed";
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export function timeAgo(date: Date | string): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} wk ago`;
  return formatDate(date);
}

export function scoreTone(score: number): "good" | "ok" | "low" {
  return score >= 80 ? "good" : score >= 60 ? "ok" : "low";
}

/** Compact monthly salary for cards: "₱60k–₱85k". */
export function formatSalaryCompact(min: number | null, max: number | null, currency = "PHP"): string {
  const symbol = currency === "PHP" ? "₱" : `${currency} `;
  const k = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}`.replace(/\.0$/, "") + "k" : String(n));
  if (min && max) return `${symbol}${k(min)}–${symbol}${k(max)}`;
  if (min) return `From ${symbol}${k(min)}`;
  if (max) return `Up to ${symbol}${k(max)}`;
  return "Salary not disclosed";
}
