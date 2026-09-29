"use server";

import { revalidatePath } from "next/cache";

import { toUserMessage } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { resumeInputSchema } from "@/lib/validations/resume";
import { resumeService } from "@/services/resume.service";

import type { ActionState } from "@/types";
import type { ResumeInput } from "@/lib/validations/resume";

/* =========================================================
   SAVE COMPLETE RESUME
========================================================= */

export async function saveResumeAction(
  data: ResumeInput,
): Promise<ActionState> {
  const userId = await requireUserId();

  try {
    /*
     * Validate the complete payload on the server.
     */
    const parsed = resumeInputSchema.safeParse(data);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];

      return {
        ok: false,
        message: issue?.message ?? "Please check your resume information.",
      };
    }

    const resume = parsed.data;

    /* =====================================================
       PERSONAL INFORMATION
    ===================================================== */

    await resumeService.saveStep(
      userId,
      "personal-info",
      {
        fullName: resume.fullName,
        jobTitle: resume.headline,
        email: resume.email,
        phone: resume.phone,
        location: resume.location,

        /*
         * ResumeEditor currently does not contain
         * GitHub / LinkedIn / Portfolio fields.
         */
        github: "",
        linkedin: "",
        portfolio: "",

        summary: resume.summary,
      },
      "preview",
    );

    /* =====================================================
       EXPERIENCE
    ===================================================== */

    await resumeService.saveStep(
      userId,
      "experience-entries",
      resume.experiences.map((experience) => ({
        company: experience.company,
        position: experience.role,
        location: experience.location,
        startDate: experience.startDate,
        endDate: experience.endDate,
        description: experience.description,
      })),
      "preview",
    );

    /* =====================================================
       EDUCATION
    ===================================================== */

    await resumeService.saveStep(
      userId,
      "education",
      resume.education.map((education) => ({
        school: education.school,
        degree: education.degree,
        location: "",
        startDate: education.startDate,
        endDate: education.endDate,
        honors: "",
        summary: education.description,
      })),
      "preview",
    );

    /* =====================================================
       SKILLS
    ===================================================== */

    await resumeService.saveStep(
      userId,
      "skills",
      resume.skills.map((skill) => ({
        name: skill,
        category: "Other",
      })),
      "preview",
    );

    /* =====================================================
       PROJECTS
    ===================================================== */

    await resumeService.saveStep(
      userId,
      "projects",
      resume.projects.map((project) => ({
        name: project.name,
        role: "",
        organization: "",
        date: "",
        description: project.description,
        skillsUsed: project.technologies,
        url: project.url,
      })),
      "preview",
    );

    /* =====================================================
       CERTIFICATIONS
    ===================================================== */

    await resumeService.saveStep(
      userId,
      "certifications",
      {
        certifications: resume.certifications.map((certification) => ({
          name: certification.name,
          issuer: certification.issuer,
          issueDate: certification.issuedDate,
          expirationDate: "",
          credentialId: "",
          credentialUrl: certification.url,
        })),

        /*
         * ResumeEditor currently does not have
         * a Training section.
         */
        trainings: [],
      },
      "preview",
    );

    /* =====================================================
       REVALIDATE
    ===================================================== */

    revalidatePath("/resume");
    revalidatePath("/dashboard");

    return {
      ok: true,
      message: "Resume saved successfully.",
    };
  } catch (error) {
    console.error("saveResumeAction error:", error);

    return {
      ok: false,
      message: toUserMessage(error),
    };
  }
}

/* =========================================================
   SAVE ONE WIZARD STEP
========================================================= */

export async function saveResumeStepAction(
  step: string,
  payload: unknown,
  nextStep: string | null,
): Promise<ActionState> {
  const userId = await requireUserId();

  try {
    await resumeService.saveStep(userId, step, payload, nextStep);

    revalidatePath("/dashboard");
    revalidatePath("/resume");

    return {
      ok: true,
      message: "Resume step saved successfully.",
    };
  } catch (error) {
    console.error("saveResumeStepAction error:", error);

    return {
      ok: false,
      message: toUserMessage(error),
    };
  }
}

/* =========================================================
   SAVE RESUME PROGRESS
========================================================= */

export async function saveResumeProgressAction(step: string): Promise<void> {
  const userId = await requireUserId();

  await resumeService.setLastStep(userId, step).catch((error) => {
    console.error("saveResumeProgressAction error:", error);
  });
}

/* =========================================================
   DELETE RESUME
========================================================= */

export async function deleteResumeAction(): Promise<ActionState> {
  const userId = await requireUserId();

  try {
    await resumeService.remove(userId);

    revalidatePath("/resume");
    revalidatePath("/dashboard");

    return {
      ok: true,
      message: "Resume deleted successfully.",
    };
  } catch (error) {
    console.error("deleteResumeAction error:", error);

    return {
      ok: false,
      message: toUserMessage(error),
    };
  }
}
