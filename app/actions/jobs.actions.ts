"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/session";
import { applicationService } from "@/services/application.service";
import { jobService } from "@/services/job.service";
import { toUserMessage } from "@/lib/errors";

const jobIdSchema = z.string().min(1).max(50);

export async function toggleSaveJobAction(formData: FormData): Promise<void> {
  const jobId = jobIdSchema.safeParse(formData.get("jobId"));
  if (!jobId.success) return;
  const userId = await getCurrentUserId();
  if (!userId) redirect(`/login?callbackUrl=${encodeURIComponent(`/jobs/${jobId.data}`)}`);
  await jobService.toggleSave(userId, jobId.data);
  ["/jobs", "/saved-jobs", "/dashboard", `/jobs/${jobId.data}`].forEach((p) => revalidatePath(p));
}

export async function trackApplicationAction(formData: FormData): Promise<void> {
  const jobId = jobIdSchema.safeParse(formData.get("jobId"));
  if (!jobId.success) return;
  const userId = await getCurrentUserId();
  if (!userId) redirect(`/login?callbackUrl=${encodeURIComponent(`/jobs/${jobId.data}`)}`);
  try {
    await applicationService.trackFromJob(userId, jobId.data);
  } catch (error) {
    console.error(toUserMessage(error));
    redirect(`/jobs/${jobId.data}?error=track`);
  }
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  redirect("/applications");
}
