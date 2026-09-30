import { getCurrentUserId } from "@/lib/session";
import { isSameOrigin, jsonError, ndjsonResponse } from "@/lib/http";
import { resolveResume } from "@/services/analysis/inputs";
import { resumeAnalyzerService } from "@/services/analysis/resume-analyzer.service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError("Request blocked.", 403);

  // Identity comes from the session only. Nothing in the request can choose a different user.
  const userId = await getCurrentUserId();
  if (!userId) return jsonError("Please log in to continue.", 401);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("The upload could not be read. Please try again.", 400);
  }
  const force = form.get("force") === "true";

  return ndjsonResponse(async (send) => {
    const stage = (name: string) => send({ type: "stage", stage: name });
    stage("reading");
    const resume = await resolveResume(userId, form, stage);
    const result = await resumeAnalyzerService.analyze(userId, resume, { force, stage });
    send({ type: "done", id: result.id, cached: result.cached });
  });
}
