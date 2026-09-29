"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { toUserMessage } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { analysisService } from "@/services/analysis.service";
import { atsService } from "@/services/ats.service";

export async function runResumeAnalysisAction(): Promise<void> {
  const userId = await requireUserId();
  try {
    await analysisService.runResumeAnalysis(userId);
  } catch (error) {
    redirect(`/analyzer?error=${encodeURIComponent(toUserMessage(error))}`);
  }
  revalidatePath("/analyzer");
  revalidatePath("/dashboard");
  redirect("/analyzer");
}

export async function runATSAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const jobId = z.string().min(1).max(50).safeParse(formData.get("jobId"));
  if (!jobId.success) redirect("/ats-checker");
  try {
    await atsService.run(userId, jobId.data);
  } catch (error) {
    redirect(`/ats-checker?jobId=${jobId.data}&error=${encodeURIComponent(toUserMessage(error))}`);
  }
  revalidatePath("/ats-checker");
  revalidatePath("/dashboard");
  redirect(`/ats-checker?jobId=${jobId.data}`);
}
