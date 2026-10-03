import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JobDetailBody } from "@/components/jobs/JobDetailBody";
import { PageMessage } from "@/components/ui/PageMessage";
import { getCurrentUserId } from "@/lib/session";
import { jobService } from "@/services/job.service";
import { toJobDetailDTO } from "@/services/social/mappers";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await jobService.getPublic(id);
  if (!job) return { title: "Job not found" };
  return { title: `${job.title} at ${job.company}`, description: job.description.slice(0, 155) };
}

/** Full-page job details: used on mobile, for shared links and for deep links. Desktop search uses the split view in /jobs. */
export default async function JobDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error } = await searchParams;
  const userId = await getCurrentUserId();
  const data = await jobService.detail(id, userId);
  if (!data) notFound();

  return (
    <div className="job-page">
      <Link href="/jobs" className="small">← Back to jobs</Link>
      <PageMessage message={error ? "We couldn't track this application. Please try again." : undefined} />
      <JobDetailBody detail={toJobDetailDTO(data)} signedIn={Boolean(userId)} />
    </div>
  );
}
