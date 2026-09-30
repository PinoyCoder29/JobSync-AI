import { AppError } from "@/lib/errors";
import { jobRepository } from "@/repositories/job.repository";
import { resumeTextService } from "@/services/resume.service";
import { extractTextFromFile } from "./file-extraction";
import { normalizeText } from "./text-utils";

export type ResumeSource = "builder" | "file" | "text";
export type JobSource = "job" | "file" | "text";

export type ResolvedResume = { source: ResumeSource; raw: string; text: string; resumeId: string | null; label: string };
export type ResolvedJob = { source: JobSource; text: string; jobId: string | null; title: string; company: string; label: string };

const MIN_RESUME_CHARS = 150;
const MIN_JOB_CHARS = 80;
const MAX_PASTE_CHARS = 60_000;

const asString = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
const asFile = (v: FormDataEntryValue | null): File | null => (v instanceof File && v.size > 0 ? v : null);

/** Works out where the resume comes from: explicit `resumeSource`, otherwise whatever was provided. */
export async function resolveResume(userId: string, form: FormData, onStage?: (s: string) => void): Promise<ResolvedResume> {
  const file = asFile(form.get("resumeFile"));
  const pasted = asString(form.get("resumeText"));
  const explicit = asString(form.get("resumeSource"));
  const source: ResumeSource =
    explicit === "builder" || explicit === "file" || explicit === "text" ? explicit : file ? "file" : pasted.trim() ? "text" : "builder";

  let raw: string;
  let resumeId: string | null = null;
  let label: string;

  if (source === "builder") {
    onStage?.("reading");
    const owned = await resumeTextService.getOwnedText(userId, asString(form.get("resumeId")) || null);
    raw = owned.text;
    resumeId = owned.resumeId;
    label = "JobSync resume";
  } else if (source === "file") {
    if (!file) throw new AppError("Choose a PDF, DOCX or TXT file to upload.");
    onStage?.("extracting");
    const extracted = await extractTextFromFile(file);
    raw = extracted.text;
    label = extracted.fileName;
  } else {
    onStage?.("reading");
    if (pasted.length > MAX_PASTE_CHARS) throw new AppError("That text is too long for a resume.");
    raw = pasted;
    label = "Pasted text";
  }

  const text = normalizeText(raw);
  if (text.length === 0) throw new AppError("We couldn't find any text in the resume.");
  if (text.length < MIN_RESUME_CHARS) {
    throw new AppError(
      source === "file"
        ? "Almost no text could be read from this file. If it is a scanned image, export a text-based PDF or paste the text instead."
        : "The resume is too short to analyze. Add more detail and try again.",
    );
  }
  return { source, raw, text, resumeId, label };
}

function jobToText(job: NonNullable<Awaited<ReturnType<typeof jobRepository.findById>>>): string {
  const list = (title: string, items: string[]) => (items.length ? `\n${title}:\n- ${items.join("\n- ")}` : "");
  return [
    `${job.title} at ${job.company}`,
    `Location: ${job.location}`,
    job.description,
    list("Responsibilities", job.responsibilities),
    list("Requirements", job.requirements),
    list("Preferred qualifications", job.preferred),
    `\nSkills: ${job.skills.map((s) => `${s.skill.name}${s.required ? "" : " (preferred)"}`).join(", ")}`,
  ].join("\n");
}

export async function resolveJob(form: FormData): Promise<ResolvedJob> {
  const file = asFile(form.get("jobFile"));
  const pasted = asString(form.get("jobText"));
  const jobId = asString(form.get("jobId"));
  const explicit = asString(form.get("jobSource"));
  const source: JobSource =
    explicit === "job" || explicit === "file" || explicit === "text" ? explicit : jobId ? "job" : file ? "file" : "text";

  if (source === "job") {
    if (!jobId) throw new AppError("Select a job to compare your resume with.");
    const job = await jobRepository.findById(jobId); // only active, public jobs
    if (!job) throw new AppError("That job is no longer available.", "NOT_FOUND");
    return { source, text: normalizeText(jobToText(job)), jobId: job.id, title: job.title, company: job.company, label: `${job.title} – ${job.company}` };
  }

  let raw: string;
  let label: string;
  if (source === "file") {
    if (!file) throw new AppError("Choose a job description file (PDF, DOCX or TXT).");
    const extracted = await extractTextFromFile(file);
    raw = extracted.text;
    label = extracted.fileName;
  } else {
    if (pasted.length > MAX_PASTE_CHARS) throw new AppError("That job description is too long.");
    raw = pasted;
    label = "Pasted job description";
  }
  const text = normalizeText(raw);
  if (text.length < MIN_JOB_CHARS) throw new AppError("Add a job description first. The ATS check compares your resume with a specific job, so it needs the job's details.");
  return { source, text, jobId: null, title: "", company: "", label };
}
