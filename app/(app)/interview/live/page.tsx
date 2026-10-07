import type { Metadata } from "next";
import Link from "next/link";
import { LiveInterviewSetup } from "@/components/interview/LiveInterviewSetup";
import { INTERVIEW_TYPE_KEYS, type InterviewTypeKey } from "@/lib/interview-types";
import { requireUserId } from "@/lib/session";
import { jobRepository } from "@/repositories/job.repository";

export const metadata: Metadata = { title: "AI Interview" };
export const dynamic = "force-dynamic";

export default async function LiveInterviewSetupPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireUserId();
  const { type } = await searchParams;
  const defaultType = (INTERVIEW_TYPE_KEYS as string[]).includes(type ?? "") ? (type as InterviewTypeKey) : "BEHAVIORAL";
  const jobs = (await jobRepository.listActive(50)).map((j) => ({ id: j.id, title: j.title, company: j.company }));
  return (
    <div className="live-wrap">
      <Link href="/interview" className="small text-decoration-none"><i className="bi bi-arrow-left" aria-hidden="true" /> Interview preparation</Link>
      <h1 className="page-title mt-2">AI Interviewer</h1>
      <p className="text-muted mb-4">An interviewer that speaks, listens, and adapts its questions to what you actually say. Pick a type to begin.</p>
      <LiveInterviewSetup jobs={jobs} defaultType={defaultType} />
    </div>
  );
}
