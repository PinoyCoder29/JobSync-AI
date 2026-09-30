import { prisma } from "@/lib/prisma";
import type { z } from "zod";

import type {
  certificationSchema,
  educationSchema,
  experienceSchema,
  internshipSchema,
  personalInfoSchema,
  projectSchema,
  skillSchema,
  trainingSchema,
} from "@/lib/validations/resume";

const ordered = {
  orderBy: {
    sortOrder: "asc" as const,
  },
};

export const resumeRepository = {
  /* =====================================================
     FIND RESUME
  ===================================================== */

  findByUser(userId: string) {
    return prisma.resume.findUnique({
      where: {
        userId,
      },

      include: {
        experiences: ordered,

        education: ordered,

        projects: ordered,

        certifications: ordered,

        trainings: ordered,

        skills: {
          ...ordered,

          include: {
            skill: true,
          },
        },
      },
    });
  },

  /* =====================================================
     CREATE / FIND RESUME
  ===================================================== */

  async ensureResume(userId: string) {
    const existing = await prisma.resume.findUnique({
      where: {
        userId,
      },

      select: {
        id: true,
      },
    });

    if (existing) {
      return existing;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        name: true,
        email: true,
      },
    });

    return prisma.resume.create({
      data: {
        userId,
        fullName: user?.name ?? "",
        email: user?.email ?? "",
      },

      select: {
        id: true,
      },
    });
  },

  /* =====================================================
     PERSONAL INFORMATION
  ===================================================== */

  async savePersonal(
    userId: string,
    p: z.infer<typeof personalInfoSchema>,
    lastStep: string | null,
  ) {
    const resume = await this.ensureResume(userId);

    return prisma.resume.update({
      where: {
        id: resume.id,
      },

      data: {
        fullName: p.fullName,
        headline: p.jobTitle,
        email: p.email,
        phone: p.phone,
        location: p.location,

        githubUrl: p.github,
        linkedinUrl: p.linkedin,
        portfolioUrl: p.portfolio,

        summary: p.summary,

        ...(lastStep
          ? {
              lastStep,
            }
          : {}),
      },
    });
  },

  /* =====================================================
     EXPERIENCE QUESTION
  ===================================================== */

  async saveHasExperience(
    userId: string,
    value: boolean | null,
    lastStep: string | null,
  ) {
    const resume = await this.ensureResume(userId);

    return prisma.resume.update({
      where: {
        id: resume.id,
      },

      data: {
        hasExperience: value,

        ...(lastStep
          ? {
              lastStep,
            }
          : {}),
      },
    });
  },

  /* =====================================================
     WORK EXPERIENCE
  ===================================================== */

  async replaceExperiences(
    userId: string,
    items: z.infer<typeof experienceSchema>[],
    lastStep: string | null,
  ) {
    const resume = await this.ensureResume(userId);

    await prisma.resumeExperience.deleteMany({
      where: {
        resumeId: resume.id,
        kind: "WORK",
      },
    });

    if (items.length > 0) {
      await prisma.resumeExperience.createMany({
        data: items.map((experience, index) => ({
          resumeId: resume.id,

          kind: "WORK" as const,

          company: experience.company,

          role: experience.position,

          location: experience.location,

          startDate: experience.startDate,

          endDate: experience.endDate,

          description: experience.description,

          sortOrder: index,
        })),
      });
    }

    if (lastStep) {
      await prisma.resume.update({
        where: {
          id: resume.id,
        },

        data: {
          lastStep,
        },
      });
    }

    return prisma.resume.findUnique({
      where: {
        id: resume.id,
      },
    });
  },

  /* =====================================================
     INTERNSHIP
  ===================================================== */

  async replaceInternships(
    userId: string,
    items: z.infer<typeof internshipSchema>[],
    lastStep: string | null,
  ) {
    const resume = await this.ensureResume(userId);

    await prisma.resumeExperience.deleteMany({
      where: {
        resumeId: resume.id,
        kind: "INTERNSHIP",
      },
    });

    if (items.length > 0) {
      await prisma.resumeExperience.createMany({
        data: items.map((internship, index) => ({
          resumeId: resume.id,

          kind: "INTERNSHIP" as const,

          company: internship.company,

          role: internship.position,

          department: internship.department,

          location: internship.location,

          startDate: internship.startDate,

          endDate: internship.endDate,

          description: internship.description,

          sortOrder: index,
        })),
      });
    }

    if (lastStep) {
      await prisma.resume.update({
        where: {
          id: resume.id,
        },

        data: {
          lastStep,
        },
      });
    }

    return prisma.resume.findUnique({
      where: {
        id: resume.id,
      },
    });
  },

  /* =====================================================
     EDUCATION
  ===================================================== */

  async replaceEducation(
    userId: string,
    items: z.infer<typeof educationSchema>[],
    lastStep: string | null,
  ) {
    const resume = await this.ensureResume(userId);

    await prisma.resumeEducation.deleteMany({
      where: {
        resumeId: resume.id,
      },
    });

    if (items.length > 0) {
      await prisma.resumeEducation.createMany({
        data: items.map((education, index) => ({
          resumeId: resume.id,

          school: education.school,

          degree: education.degree,

          location: education.location,

          honors: education.honors,

          startDate: education.startDate,

          endDate: education.endDate,

          description: education.summary,

          sortOrder: index,
        })),
      });
    }

    if (lastStep) {
      await prisma.resume.update({
        where: {
          id: resume.id,
        },

        data: {
          lastStep,
        },
      });
    }

    return prisma.resume.findUnique({
      where: {
        id: resume.id,
      },
    });
  },

  /* =====================================================
     PROJECTS
  ===================================================== */

  async replaceProjects(
    userId: string,
    items: z.infer<typeof projectSchema>[],
    lastStep: string | null,
  ) {
    const resume = await this.ensureResume(userId);

    await prisma.resumeProject.deleteMany({
      where: {
        resumeId: resume.id,
      },
    });

    if (items.length > 0) {
      await prisma.resumeProject.createMany({
        data: items.map((project, index) => ({
          resumeId: resume.id,

          name: project.name,

          role: project.role,

          organization: project.organization,

          date: project.date,

          url: project.url,

          description: project.description,

          technologies: project.skillsUsed,

          sortOrder: index,
        })),
      });
    }

    if (lastStep) {
      await prisma.resume.update({
        where: {
          id: resume.id,
        },

        data: {
          lastStep,
        },
      });
    }

    return prisma.resume.findUnique({
      where: {
        id: resume.id,
      },
    });
  },

  /* =====================================================
     CERTIFICATIONS + TRAININGS
  ===================================================== */

  async replaceCertificationsAndTrainings(
    userId: string,
    certs: z.infer<typeof certificationSchema>[],
    trainings: z.infer<typeof trainingSchema>[],
    lastStep: string | null,
  ) {
    const resume = await this.ensureResume(userId);

    await prisma.resumeCertification.deleteMany({
      where: {
        resumeId: resume.id,
      },
    });

    await prisma.resumeTraining.deleteMany({
      where: {
        resumeId: resume.id,
      },
    });

    if (certs.length > 0) {
      await prisma.resumeCertification.createMany({
        data: certs.map((certification, index) => ({
          resumeId: resume.id,

          name: certification.name,

          issuer: certification.issuer,

          issuedDate: certification.issueDate,

          expirationDate: certification.expirationDate,

          credentialId: certification.credentialId,

          url: certification.credentialUrl,

          sortOrder: index,
        })),
      });
    }

    if (trainings.length > 0) {
      await prisma.resumeTraining.createMany({
        data: trainings.map((training, index) => ({
          resumeId: resume.id,

          name: training.name,

          provider: training.provider,

          date: training.date,

          description: training.description,

          sortOrder: index,
        })),
      });
    }

    if (lastStep) {
      await prisma.resume.update({
        where: {
          id: resume.id,
        },

        data: {
          lastStep,
        },
      });
    }

    return prisma.resume.findUnique({
      where: {
        id: resume.id,
      },
    });
  },

  /* =====================================================
     SKILLS
  ===================================================== */

  async replaceSkills(
    userId: string,
    items: z.infer<typeof skillSchema>[],
    lastStep: string | null,
  ) {
    const resume = await this.ensureResume(userId);

    await prisma.resumeSkill.deleteMany({
      where: {
        resumeId: resume.id,
      },
    });

    if (items.length === 0) {
      if (lastStep) {
        await prisma.resume.update({
          where: {
            id: resume.id,
          },

          data: {
            lastStep,
          },
        });
      }

      return;
    }

    /*
     * Remove duplicate skills.
     */
    const unique = [
      ...new Map(
        items.map((skill) => [skill.name.trim().toLowerCase(), skill]),
      ).values(),
    ];

    const rows: {
      resumeId: string;
      skillId: string;
      category: string;
      sortOrder: number;
    }[] = [];

    /*
     * Create/find global skills.
     */
    for (const [index, skillInput] of unique.entries()) {
      const skillName = skillInput.name.trim();

      if (!skillName) {
        continue;
      }

      const skill = await prisma.skill.upsert({
        where: {
          name: skillName,
        },

        create: {
          name: skillName,
        },

        update: {},
      });

      rows.push({
        resumeId: resume.id,

        skillId: skill.id,

        category: skillInput.category?.trim() || "Other",

        sortOrder: index,
      });
    }

    if (rows.length > 0) {
      await prisma.resumeSkill.createMany({
        data: rows,
      });
    }

    if (lastStep) {
      await prisma.resume.update({
        where: {
          id: resume.id,
        },

        data: {
          lastStep,
        },
      });
    }

    return prisma.resume.findUnique({
      where: {
        id: resume.id,
      },
    });
  },

  /* =====================================================
     LAST STEP
  ===================================================== */

  setLastStep(userId: string, lastStep: string) {
    return prisma.resume.updateMany({
      where: {
        userId,
      },

      data: {
        lastStep,
      },
    });
  },

  /* =====================================================
     DELETE RESUME
  ===================================================== */

  deleteByUser(userId: string) {
    return prisma.resume.deleteMany({
      where: {
        userId,
      },
    });
  },
};
