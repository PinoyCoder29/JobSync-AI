import type { Metadata } from "next";
import { ResumeWizard } from "@/components/resume/ResumeWizard";
import { ResumeProvider } from "@/context/ResumeContext";
import { requireUserId } from "@/lib/session";
import {
  computeResumeCompletion,
  resumeService,
} from "@/services/resume.service";

export const metadata: Metadata = { title: "Resume builder" };

export default async function ResumePage() {
  const userId = await requireUserId();
  const { data, exists, lastStep } = await resumeService.getForEditor(userId);
  const completion = exists ? computeResumeCompletion(data) : 0;

  return (
    <div>
      <h1>hi</h1>
      <h1 className="page-title">Resume builder</h1>
      <p className="text-muted mb-4">
        {exists
          ? `Your resume is ${completion}% complete. Each step is saved to your account when you continue.`
          : "Answer a few steps and get an ATS-friendly PDF. Each step is saved to your account when you continue."}
      </p>
      {/* key: remount with fresh server data after a reset or a revalidation from another tab */}
      <ResumeProvider initialData={data} initialStep={lastStep}>
        <ResumeWizard />
      </ResumeProvider>
    </div>
  );
}
