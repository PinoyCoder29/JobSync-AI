import type { Metadata } from "next";
import { ResumeEditor } from "@/components/resume/ResumeEditor";
import { requireUserId } from "@/lib/session";
import { computeResumeCompletion, resumeService } from "@/services/resume.service";

export const metadata: Metadata = { title: "Resume builder" };

export default async function ResumePage() {
  const userId = await requireUserId();
  const { data, exists } = await resumeService.getForEditor(userId);
  const completion = exists ? computeResumeCompletion(data) : 0;
  return (
    <div>
      <h1 className="page-title">Resume builder</h1>
      <p className="text-muted mb-4">
        {exists ? `Your resume is ${completion}% complete.` : "Start with the basics – nothing is saved until you press Save resume."}
      </p>
      <ResumeEditor initial={data} />
    </div>
  );
}
