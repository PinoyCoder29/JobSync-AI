"use client";

import { useId, useState, useTransition } from "react";
import { saveResumeAction } from "@/app/actions/resume.actions";
import type { ResumeInput } from "@/lib/validations/resume";
import type { ActionState } from "@/types";
import type { ResumeData } from "@/types/resume";
import ResumePreview from "./ResumePreview";

type Exp = ResumeInput["experiences"][number];
type Edu = ResumeInput["education"][number];
type Proj = ResumeInput["projects"][number];
type Cert = ResumeInput["certifications"][number];

const blankExp: Exp = {
  company: "",
  role: "",
  location: "",
  startDate: "",
  endDate: "",
  description: "",
};

const blankEdu: Edu = {
  school: "",
  degree: "",
  field: "",
  startDate: "",
  endDate: "",
  description: "",
};

const blankProj: Proj = {
  name: "",
  url: "",
  description: "",
  technologies: "",
};

const blankCert: Cert = {
  name: "",
  issuer: "",
  issuedDate: "",
  url: "",
};

function Field({
  label,
  value,
  onChange,
  area,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  area?: boolean;
  type?: string;
  placeholder?: string;
}) {
  const id = useId();

  return (
    <div className="mb-2">
      <label htmlFor={id} className="form-label small fw-semibold mb-1">
        {label}
      </label>

      {area ? (
        <textarea
          id={id}
          className="form-control"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          id={id}
          type={type}
          className="form-control"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function Repeater<T>({
  title,
  hint,
  items,
  onChange,
  blank,
  addLabel,
  itemLabel,
  render,
}: {
  title: string;
  hint?: string;
  items: T[];
  onChange: (items: T[]) => void;
  blank: T;
  addLabel: string;
  itemLabel: (item: T, index: number) => string;
  render: (item: T, patch: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const move = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= items.length) {
      return;
    }

    const copy = [...items];

    [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];

    onChange(copy);
  };

  return (
    <section className="editor-section">
      <h3 className="sub-title">{title}</h3>

      {hint && <p className="text-muted small">{hint}</p>}

      {items.length === 0 && (
        <p className="text-muted small fst-italic">Nothing added yet.</p>
      )}

      {items.map((item, index) => (
        <div key={index} className="editor-item">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <strong className="small">{itemLabel(item, index)}</strong>

            <div
              className="btn-group btn-group-sm"
              role="group"
              aria-label={`Actions for ${title} ${index + 1}`}
            >
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => move(index, -1)}
                disabled={index === 0}
              >
                Up
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
              >
                Down
              </button>

              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() =>
                  onChange(items.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                Remove
              </button>
            </div>
          </div>

          {render(item, (patch) =>
            onChange(
              items.map((current, itemIndex) =>
                itemIndex === index
                  ? {
                      ...current,
                      ...patch,
                    }
                  : current,
              ),
            ),
          )}
        </div>
      ))}

      <button
        type="button"
        className="btn btn-outline-brand btn-sm"
        onClick={() => onChange([...items, { ...blank }])}
      >
        + {addLabel}
      </button>
    </section>
  );
}

/**
 * Converts the old/full editor ResumeInput structure
 * into the ResumeData structure expected by ResumePreview.
 */
function toPreviewData(data: ResumeInput): ResumeData {
  return {
    personalInfo: {
      fullName: data.fullName || "",
      jobTitle: data.headline || "",
      email: data.email || "",
      phone: data.phone || "",
      location: data.location || "",
      github: "",
      linkedin: "",
      portfolio: "",
      summary: data.summary || "",
    },

    hasExperience: data.experiences.length > 0 ? "yes" : "no",

    experience: data.experiences.map((experience, index) => ({
      id: `experience-${index}`,
      company: experience.company || "",
      position: experience.role || "",
      location: experience.location || "",
      startDate: experience.startDate || "",
      endDate: experience.endDate || "",
      description: experience.description || "",
    })),

    internship: [],

    education: data.education.map((education, index) => ({
      id: `education-${index}`,
      school: education.school || "",
      degree: education.degree || "",
      location: "",
      startDate: education.startDate || "",
      endDate: education.endDate || "",
      honors: "",
      summary: education.description || "",
    })),

    skills: data.skills.map((skill, index) => ({
      id: `skill-${index}`,
      name: skill,
      category: "Technical",
    })),

    projects: data.projects.map((project, index) => ({
      id: `project-${index}`,
      name: project.name || "",
      role: "",
      organization: "",
      date: "",
      description: project.description || "",
      skillsUsed: project.technologies || "",
      url: project.url || "",
    })),

    certifications: data.certifications.map((certification, index) => ({
      id: `certification-${index}`,
      name: certification.name || "",
      issuer: certification.issuer || "",
      issueDate: certification.issuedDate || "",
      expirationDate: "",
      credentialId: "",
      credentialUrl: certification.url || "",
    })),

    trainings: [],
  };
}

export function ResumeEditor({ initial }: { initial: ResumeInput }) {
  const [data, setData] = useState<ResumeInput>(initial);

  const [skillsText, setSkillsText] = useState(initial.skills.join(", "));

  const [result, setResult] = useState<ActionState | null>(null);

  const [pending, start] = useTransition();

  const [tab, setTab] = useState<"edit" | "preview">("edit");

  const set = <K extends keyof ResumeInput>(key: K, value: ResumeInput[K]) => {
    setData((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const save = () =>
    start(async () => {
      setResult(null);

      const response = await saveResumeAction(data);

      setResult(response);
    });

  const previewData = toPreviewData(data);

  return (
    <div>
      {/* Top controls */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        {/* Mobile tabs */}
        <div
          className="btn-group d-lg-none"
          role="group"
          aria-label="Editor or preview"
        >
          <button
            type="button"
            className={`btn btn-sm ${
              tab === "edit" ? "btn-brand" : "btn-outline-brand"
            }`}
            onClick={() => setTab("edit")}
          >
            Edit
          </button>

          <button
            type="button"
            className={`btn btn-sm ${
              tab === "preview" ? "btn-brand" : "btn-outline-brand"
            }`}
            onClick={() => setTab("preview")}
          >
            Preview
          </button>
        </div>

        <div className="d-flex align-items-center gap-3 ms-auto">
          {result && (
            <span
              role={result.ok ? "status" : "alert"}
              className={result.ok ? "text-success small" : "text-danger small"}
            >
              {result.message ||
                (result.ok ? "Resume saved." : "Unable to save resume.")}
            </span>
          )}

          <button
            type="button"
            className="btn btn-brand"
            onClick={save}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Saving…" : "Save resume"}
          </button>
        </div>
      </div>

      <div className="row g-4">
        {/* ========================= */}
        {/* EDITOR */}
        {/* ========================= */}

        <div
          className={`col-lg-6 ${tab === "preview" ? "d-none d-lg-block" : ""}`}
        >
          {/* Personal Information */}
          <section className="editor-section">
            <h3 className="sub-title">Personal information</h3>

            <div className="row">
              <div className="col-sm-6">
                <Field
                  label="Full name"
                  value={data.fullName}
                  onChange={(value) => set("fullName", value)}
                />
              </div>

              <div className="col-sm-6">
                <Field
                  label="Email"
                  type="email"
                  value={data.email}
                  onChange={(value) => set("email", value)}
                />
              </div>

              <div className="col-sm-6">
                <Field
                  label="Phone"
                  value={data.phone}
                  onChange={(value) => set("phone", value)}
                />
              </div>

              <div className="col-sm-6">
                <Field
                  label="Location"
                  value={data.location}
                  onChange={(value) => set("location", value)}
                />
              </div>
            </div>

            <Field
              label="Headline"
              value={data.headline}
              onChange={(value) => set("headline", value)}
              placeholder="e.g. Junior Full Stack Developer"
            />

            <Field
              label="Professional summary"
              area
              value={data.summary}
              onChange={(value) => set("summary", value)}
              placeholder="2–3 sentences: target role, strongest skills, one achievement."
            />
          </section>

          {/* Experience */}
          <Repeater<Exp>
            title="Experience"
            items={data.experiences}
            onChange={(value) => set("experiences", value)}
            blank={blankExp}
            addLabel="Add experience"
            itemLabel={(experience, index) =>
              experience.role || `Experience ${index + 1}`
            }
            render={(experience, patch) => (
              <>
                <div className="row">
                  <div className="col-sm-6">
                    <Field
                      label="Role"
                      value={experience.role}
                      onChange={(value) =>
                        patch({
                          role: value,
                        })
                      }
                    />
                  </div>

                  <div className="col-sm-6">
                    <Field
                      label="Company"
                      value={experience.company}
                      onChange={(value) =>
                        patch({
                          company: value,
                        })
                      }
                    />
                  </div>

                  <div className="col-sm-4">
                    <Field
                      label="Location"
                      value={experience.location}
                      onChange={(value) =>
                        patch({
                          location: value,
                        })
                      }
                    />
                  </div>

                  <div className="col-sm-4">
                    <Field
                      label="Start (YYYY-MM)"
                      value={experience.startDate}
                      onChange={(value) =>
                        patch({
                          startDate: value,
                        })
                      }
                      placeholder="2024-01"
                    />
                  </div>

                  <div className="col-sm-4">
                    <Field
                      label="End (blank = present)"
                      value={experience.endDate}
                      onChange={(value) =>
                        patch({
                          endDate: value,
                        })
                      }
                      placeholder="2025-03"
                    />
                  </div>
                </div>

                <Field
                  label="What you did and achieved"
                  area
                  value={experience.description}
                  onChange={(value) =>
                    patch({
                      description: value,
                    })
                  }
                />
              </>
            )}
          />

          {/* Education */}
          <Repeater<Edu>
            title="Education"
            items={data.education}
            onChange={(value) => set("education", value)}
            blank={blankEdu}
            addLabel="Add education"
            itemLabel={(education, index) =>
              education.school || `Education ${index + 1}`
            }
            render={(education, patch) => (
              <>
                <div className="row">
                  <div className="col-sm-6">
                    <Field
                      label="School"
                      value={education.school}
                      onChange={(value) =>
                        patch({
                          school: value,
                        })
                      }
                    />
                  </div>

                  <div className="col-sm-6">
                    <Field
                      label="Degree"
                      value={education.degree}
                      onChange={(value) =>
                        patch({
                          degree: value,
                        })
                      }
                    />
                  </div>

                  <div className="col-sm-4">
                    <Field
                      label="Field of study"
                      value={education.field}
                      onChange={(value) =>
                        patch({
                          field: value,
                        })
                      }
                    />
                  </div>

                  <div className="col-sm-4">
                    <Field
                      label="Start"
                      value={education.startDate}
                      onChange={(value) =>
                        patch({
                          startDate: value,
                        })
                      }
                      placeholder="2020"
                    />
                  </div>

                  <div className="col-sm-4">
                    <Field
                      label="End"
                      value={education.endDate}
                      onChange={(value) =>
                        patch({
                          endDate: value,
                        })
                      }
                      placeholder="2024"
                    />
                  </div>
                </div>
              </>
            )}
          />

          {/* Skills */}
          <section className="editor-section">
            <h3 className="sub-title">Skills</h3>

            <Field
              label="Skills (comma separated)"
              value={skillsText}
              onChange={(value) => {
                setSkillsText(value);

                set(
                  "skills",
                  value
                    .split(",")
                    .map((skill) => skill.trim())
                    .filter(Boolean),
                );
              }}
              placeholder="React, Next.js, TypeScript, PostgreSQL"
            />
          </section>

          {/* Projects */}
          <Repeater<Proj>
            title="Projects"
            items={data.projects}
            onChange={(value) => set("projects", value)}
            blank={blankProj}
            addLabel="Add project"
            itemLabel={(project, index) =>
              project.name || `Project ${index + 1}`
            }
            render={(project, patch) => (
              <>
                <div className="row">
                  <div className="col-sm-6">
                    <Field
                      label="Name"
                      value={project.name}
                      onChange={(value) =>
                        patch({
                          name: value,
                        })
                      }
                    />
                  </div>

                  <div className="col-sm-6">
                    <Field
                      label="Link"
                      type="url"
                      value={project.url}
                      onChange={(value) =>
                        patch({
                          url: value,
                        })
                      }
                      placeholder="https://"
                    />
                  </div>
                </div>

                <Field
                  label="Technologies"
                  value={project.technologies}
                  onChange={(value) =>
                    patch({
                      technologies: value,
                    })
                  }
                />

                <Field
                  label="Description"
                  area
                  value={project.description}
                  onChange={(value) =>
                    patch({
                      description: value,
                    })
                  }
                />
              </>
            )}
          />

          {/* Certifications */}
          <Repeater<Cert>
            title="Certifications"
            items={data.certifications}
            onChange={(value) => set("certifications", value)}
            blank={blankCert}
            addLabel="Add certification"
            itemLabel={(certification, index) =>
              certification.name || `Certification ${index + 1}`
            }
            render={(certification, patch) => (
              <div className="row">
                <div className="col-sm-6">
                  <Field
                    label="Name"
                    value={certification.name}
                    onChange={(value) =>
                      patch({
                        name: value,
                      })
                    }
                  />
                </div>

                <div className="col-sm-6">
                  <Field
                    label="Issuer"
                    value={certification.issuer}
                    onChange={(value) =>
                      patch({
                        issuer: value,
                      })
                    }
                  />
                </div>

                <div className="col-sm-6">
                  <Field
                    label="Date"
                    value={certification.issuedDate}
                    onChange={(value) =>
                      patch({
                        issuedDate: value,
                      })
                    }
                    placeholder="2024-05"
                  />
                </div>

                <div className="col-sm-6">
                  <Field
                    label="Credential link"
                    type="url"
                    value={certification.url}
                    onChange={(value) =>
                      patch({
                        url: value,
                      })
                    }
                    placeholder="https://"
                  />
                </div>
              </div>
            )}
          />
        </div>

        {/* ========================= */}
        {/* PREVIEW */}
        {/* ========================= */}

        <div
          className={`col-lg-6 ${tab === "edit" ? "d-none d-lg-block" : ""}`}
        >
          <div className="preview-sticky">
            <ResumePreview data={previewData} />
          </div>
        </div>
      </div>
    </div>
  );
}
