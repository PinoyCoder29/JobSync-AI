"use client";

import { ResumeData } from "@/types/resume";

interface ResumePreviewProps {
  data: ResumeData;
  onStartOver?: () => void;
}

export default function ResumePreview({
  data,
  onStartOver,
}: ResumePreviewProps) {
  if (!data) {
    return (
      <div className="p-5 bg-white text-dark">
        <h1>Resume Preview</h1>
        <p>No resume data available.</p>

        {onStartOver && (
          <button
            type="button"
            className="btn btn-outline-secondary mt-3"
            onClick={onStartOver}
          >
            ← Ulit sa Simula
          </button>
        )}
      </div>
    );
  }

  const personalInfo = data.personalInfo || {};
  const experience = data.experience || [];
  const internship = data.internship || [];
  const education = data.education || [];
  const skills = data.skills || [];
  const projects = data.projects || [];
  const certifications = data.certifications || [];
  const trainings = data.trainings || [];

  const groupedSkills: Record<string, typeof skills> = {};

  skills.forEach((skill) => {
    const category = skill.category?.trim() || "Technical";

    if (!groupedSkills[category]) {
      groupedSkills[category] = [];
    }

    groupedSkills[category].push(skill);
  });

  const formatDateRange = (start?: string, end?: string) => {
    if (!start && !end) {
      return "";
    }

    if (start && end) {
      return `${start} - ${end}`;
    }

    return start || end || "";
  };

  return (
    <div>
      {/* Resume */}
      <div
        style={{
          width: "794px",
          minHeight: "1123px",
          margin: "0 auto",
          padding: "42px 48px",
          backgroundColor: "#ffffff",
          color: "#111111",
          boxSizing: "border-box",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: "11px",
          lineHeight: 1.35,
        }}
      >
        {/* Header */}
        <div
          style={{
            borderBottom: "2px solid #111",
            paddingBottom: "11px",
            marginBottom: "13px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "25px",
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {personalInfo.fullName || "Your Name"}
          </h1>

          {personalInfo.jobTitle && (
            <div
              style={{
                marginTop: "3px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {personalInfo.jobTitle}
            </div>
          )}

          <div
            style={{
              marginTop: "6px",
              fontSize: "9px",
              lineHeight: 1.4,
            }}
          >
            {personalInfo.email && <span>{personalInfo.email}</span>}

            {personalInfo.phone && (
              <span>
                {personalInfo.email ? " | " : ""}
                {personalInfo.phone}
              </span>
            )}

            {personalInfo.location && (
              <span>
                {personalInfo.email || personalInfo.phone ? " | " : ""}
                {personalInfo.location}
              </span>
            )}

            {personalInfo.linkedin && (
              <span>
                {" | "}
                {personalInfo.linkedin}
              </span>
            )}

            {personalInfo.github && (
              <span>
                {" | "}
                {personalInfo.github}
              </span>
            )}

            {personalInfo.portfolio && (
              <span>
                {" | "}
                {personalInfo.portfolio}
              </span>
            )}
          </div>
        </div>

        {/* Professional Summary */}
        {personalInfo.summary && (
          <section style={{ marginBottom: "11px" }}>
            <h2
              style={{
                fontSize: "11px",
                margin: "0 0 4px",
                paddingBottom: "3px",
                borderBottom: "1px solid #777",
                fontWeight: 700,
              }}
            >
              PROFESSIONAL SUMMARY
            </h2>

            <p
              style={{
                margin: 0,
                whiteSpace: "pre-line",
                fontSize: "10px",
                lineHeight: 1.35,
              }}
            >
              {personalInfo.summary}
            </p>
          </section>
        )}

        {/* Work Experience */}
        {experience.length > 0 && (
          <section style={{ marginBottom: "11px" }}>
            <h2
              style={{
                fontSize: "11px",
                margin: "0 0 5px",
                paddingBottom: "3px",
                borderBottom: "1px solid #777",
                fontWeight: 700,
              }}
            >
              WORK EXPERIENCE
            </h2>

            {experience.map((entry) => (
              <div
                key={entry.id}
                style={{
                  marginBottom: "7px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "15px",
                  }}
                >
                  <div>
                    <strong>{entry.position}</strong>

                    <div
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      {entry.company}
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                      fontSize: "9px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDateRange(entry.startDate, entry.endDate)}

                    {entry.location && <div>{entry.location}</div>}
                  </div>
                </div>

                {entry.description && (
                  <p
                    style={{
                      margin: "3px 0 0",
                      whiteSpace: "pre-line",
                      fontSize: "10px",
                      lineHeight: 1.35,
                    }}
                  >
                    {entry.description}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Internship */}
        {internship.length > 0 && (
          <section style={{ marginBottom: "11px" }}>
            <h2
              style={{
                fontSize: "11px",
                margin: "0 0 5px",
                paddingBottom: "3px",
                borderBottom: "1px solid #777",
                fontWeight: 700,
              }}
            >
              INTERNSHIP / OJT
            </h2>

            {internship.map((entry) => (
              <div
                key={entry.id}
                style={{
                  marginBottom: "7px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "15px",
                  }}
                >
                  <div>
                    <strong>{entry.position}</strong>

                    <div
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      {entry.company}
                    </div>

                    {entry.department && (
                      <div>Department: {entry.department}</div>
                    )}
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                      fontSize: "9px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDateRange(entry.startDate, entry.endDate)}

                    {entry.location && <div>{entry.location}</div>}
                  </div>
                </div>

                {entry.description && (
                  <p
                    style={{
                      margin: "3px 0 0",
                      whiteSpace: "pre-line",
                      fontSize: "10px",
                      lineHeight: 1.35,
                    }}
                  >
                    {entry.description}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Education */}
        {education.length > 0 && (
          <section style={{ marginBottom: "9px" }}>
            <h2
              style={{
                fontSize: "11px",
                margin: "0 0 5px",
                paddingBottom: "3px",
                borderBottom: "1px solid #777",
                fontWeight: 700,
              }}
            >
              EDUCATION
            </h2>

            {education.map((entry) => (
              <div
                key={entry.id}
                style={{
                  marginBottom: "6px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "15px",
                  }}
                >
                  <div>
                    <strong>{entry.degree}</strong>

                    <div
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      {entry.school}
                    </div>

                    {entry.honors && (
                      <div
                        style={{
                          fontSize: "9.5px",
                        }}
                      >
                        {entry.honors}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                      fontSize: "9px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDateRange(entry.startDate, entry.endDate)}

                    {entry.location && <div>{entry.location}</div>}
                  </div>
                </div>

                {entry.summary && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      whiteSpace: "pre-line",
                      fontSize: "9.5px",
                      lineHeight: 1.3,
                    }}
                  >
                    {entry.summary}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <section style={{ marginBottom: "9px" }}>
            <h2
              style={{
                fontSize: "11px",
                margin: "0 0 4px",
                paddingBottom: "3px",
                borderBottom: "1px solid #777",
                fontWeight: 700,
              }}
            >
              SKILLS
            </h2>

            {Object.entries(groupedSkills).map(([category, categorySkills]) => (
              <div
                key={category}
                style={{
                  marginBottom: "2px",
                  fontSize: "9.5px",
                  lineHeight: 1.3,
                }}
              >
                <strong>{category}:</strong>{" "}
                {categorySkills.map((skill) => skill.name).join(", ")}
              </div>
            ))}
          </section>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <section style={{ marginBottom: "9px" }}>
            <h2
              style={{
                fontSize: "11px",
                margin: "0 0 5px",
                paddingBottom: "3px",
                borderBottom: "1px solid #777",
                fontWeight: 700,
              }}
            >
              PROJECTS
            </h2>

            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  marginBottom: "7px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "15px",
                  }}
                >
                  <div>
                    <strong>{project.name}</strong>

                    {project.role && <div>{project.role}</div>}

                    {project.organization && (
                      <div
                        style={{
                          fontWeight: 600,
                        }}
                      >
                        {project.organization}
                      </div>
                    )}
                  </div>

                  {project.date && (
                    <div
                      style={{
                        fontSize: "9px",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {project.date}
                    </div>
                  )}
                </div>

                {project.description && (
                  <p
                    style={{
                      margin: "3px 0 0",
                      whiteSpace: "pre-line",
                      fontSize: "9.5px",
                      lineHeight: 1.3,
                    }}
                  >
                    {project.description}
                  </p>
                )}

                {project.skillsUsed && (
                  <div
                    style={{
                      fontSize: "9.5px",
                    }}
                  >
                    <strong>Technologies:</strong> {project.skillsUsed}
                  </div>
                )}

                {project.url && (
                  <div
                    style={{
                      fontSize: "8.5px",
                    }}
                  >
                    {project.url}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Certifications */}
        {certifications.length > 0 && (
          <section style={{ marginBottom: "9px" }}>
            <h2
              style={{
                fontSize: "11px",
                margin: "0 0 5px",
                paddingBottom: "3px",
                borderBottom: "1px solid #777",
                fontWeight: 700,
              }}
            >
              CERTIFICATIONS
            </h2>

            {certifications.map((entry) => (
              <div
                key={entry.id}
                style={{
                  marginBottom: "5px",
                  fontSize: "9.5px",
                  lineHeight: 1.3,
                }}
              >
                <strong>{entry.name}</strong>

                <div>{entry.issuer}</div>

                {entry.issueDate && <div>{entry.issueDate}</div>}

                {entry.credentialId && (
                  <div>Credential ID: {entry.credentialId}</div>
                )}

                {entry.credentialUrl && (
                  <div
                    style={{
                      fontSize: "8.5px",
                    }}
                  >
                    {entry.credentialUrl}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Training */}
        {trainings.length > 0 && (
          <section style={{ marginBottom: "9px" }}>
            <h2
              style={{
                fontSize: "11px",
                margin: "0 0 5px",
                paddingBottom: "3px",
                borderBottom: "1px solid #777",
                fontWeight: 700,
              }}
            >
              TRAINING
            </h2>

            {trainings.map((entry) => (
              <div
                key={entry.id}
                style={{
                  marginBottom: "5px",
                  fontSize: "9.5px",
                  lineHeight: 1.3,
                }}
              >
                <strong>{entry.name}</strong>

                {entry.provider && <div>{entry.provider}</div>}

                {entry.date && <div>{entry.date}</div>}

                {entry.description && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {entry.description}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
