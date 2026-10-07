import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveInterview } from "@/components/interview/LiveInterview";
import { AppError } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { liveIdSchema } from "@/lib/validations/live-interview";
import { liveInterviewService } from "@/services/interview/live-interview.service";

export const metadata: Metadata = { title: "AI Interview" };
export const dynamic = "force-dynamic";

export default async function LiveInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const id = liveIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const state = await liveInterviewService.get(userId, id.data).catch((e: unknown) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") return null;
    throw e;
  });
  if (!state) notFound();
  return <div className="live-wrap"><LiveInterview key={state.sessionId} initial={state} /></div>;
}
