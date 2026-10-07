import type { Metadata } from "next";
import { AssistantView } from "@/components/assistant/AssistantView";
import { nextSteps } from "@/lib/assistant-steps";
import { requireUserId } from "@/lib/session";
import { dashboardService } from "@/services/dashboard.service";

export const metadata: Metadata = { title: "AI Career Assistant" };
export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const userId = await requireUserId();
  const d = await dashboardService.get(userId);
  const steps = nextSteps({
    resumeScore: d.resumeScore, atsScore: d.atsScore, practiceSessions: d.practiceSessions, profilePercent: d.profileCompletion.percent,
    gaps: d.skills.gaps, suggestions: d.resumeSuggestions, hasResume: d.resumeCompletion > 0,
  });
  return <AssistantView data={{ resumeScore: d.resumeScore, atsScore: d.atsScore, coverage: d.skills.coverage, readiness: d.readiness }} steps={steps} />;
}
