export type NextStep = { icon: string; text: string; href: string };

type StepInput = {
  resumeScore: number | null;
  atsScore: number | null;
  practiceSessions: number;
  profilePercent: number;
  gaps: { name: string; priority: string }[];
  suggestions: string[];
  hasResume: boolean;
};

/** "Recommended next steps" come from the user's real data. Never padded with generic filler. Max 4. */
export function nextSteps(d: StepInput): NextStep[] {
  const steps: NextStep[] = [];
  if (!d.hasResume) steps.push({ icon: "bi-file-earmark-plus", text: "Build your resume so the AI tools have something to work with", href: "/resume-builder" });
  else if (d.resumeScore === null) steps.push({ icon: "bi-file-earmark-check", text: "Analyze your resume to get your first score", href: "/resume-analyzer" });
  else if (d.resumeScore < 80 && d.suggestions[0]) steps.push({ icon: "bi-pencil-square", text: d.suggestions[0], href: "/resume-analyzer" });
  if (d.gaps[0]) steps.push({ icon: "bi-mortarboard", text: `Improve ${d.gaps[0].name}: it's your ${d.gaps[0].priority.toLowerCase()}-priority skill gap`, href: "/skill-analysis" });
  if (d.atsScore === null) steps.push({ icon: "bi-bullseye", text: "Check your resume against a job you like with the ATS Checker", href: "/ats-checker" });
  else if (d.atsScore < 75) steps.push({ icon: "bi-bullseye", text: `Raise your ATS score (${d.atsScore}) by adding the missing keywords`, href: "/ats-checker" });
  if (d.practiceSessions === 0) steps.push({ icon: "bi-mic", text: "Do your first AI interview practice", href: "/interview" });
  else if (d.practiceSessions < 3) steps.push({ icon: "bi-mic", text: "Practice another interview to build confidence", href: "/interview" });
  if (d.profilePercent < 80) steps.push({ icon: "bi-person-check", text: `Complete your profile (${d.profilePercent}% done)`, href: "/profile" });
  return steps.slice(0, 4);
}
