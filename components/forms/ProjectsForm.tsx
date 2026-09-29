"use client";

import { useState } from "react";
import { useResume } from "@/context/ResumeContext";
import TextField from "@/components/fields/TextField";
import TextAreaField from "@/components/fields/TextAreaField";
import FormNav from "@/components/FormNav";
import { ProjectEntry } from "@/types/resume";

const emptyDraft: Omit<ProjectEntry, "id"> = {
  name: "",
  role: "",
  organization: "",
  date: "",
  description: "",
  skillsUsed: "",
  url: "",
};

// Not just for IT — a project here can be a feasibility study, a
// classroom learning module, a community health assessment, a structural
// design project, a marketing campaign, etc. Always optional.
export default function ProjectsForm() {
  const { data, addProject, removeProject, goNext, goBack } = useResume();
  const [draft, setDraft] = useState(emptyDraft);

  const canAdd = draft.name.trim() !== "" && draft.description.trim() !== "";

  const handleAdd = () => {
    if (!canAdd) return;
    addProject({ id: crypto.randomUUID(), ...draft });
    setDraft(emptyDraft);
  };

  return (
    <div className="panel">
      <h2 className="panel-title">Projects (Optional)</h2>
      <p className="panel-subtitle">
        You can add any type of project here — thesis, feasibility study,
        classroom project, campaign, design project, or programming project. If
        you have nothing to add, simply click Continue.
      </p>

      {data.projects.length > 0 && (
        <div className="mb-4">
          {data.projects.map((proj) => (
            <div
              className="entry-row d-flex justify-content-between align-items-start"
              key={proj.id}
            >
              <div>
                <div className="fw-semibold">{proj.name}</div>
                <div className="text-secondary small">
                  {[proj.role, proj.organization].filter(Boolean).join(" · ")}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeProject(proj.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="row g-3 border-top pt-3">
        <TextField
          label="Project Name"
          value={draft.name}
          onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
          placeholder="Community Health Assessment"
          required
          colClass="col-md-6"
        />
        <TextField
          label="Your Role (optional)"
          value={draft.role ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, role: v }))}
          placeholder="Team Leader"
          colClass="col-md-6"
        />
        <TextField
          label="Organization / School (optional)"
          value={draft.organization ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, organization: v }))}
          placeholder="Batangas State University"
          colClass="col-md-6"
        />
        <TextField
          label="Date (optional)"
          value={draft.date ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, date: v }))}
          placeholder="2024"
          colClass="col-md-6"
        />
        <TextAreaField
          label="Description / Contributions"
          value={draft.description}
          onChange={(v) => setDraft((d) => ({ ...d, description: v }))}
          placeholder="Describe the project, your contributions, and the results or outcomes."
          rows={4}
        />
        <TextField
          label="Skills / Tools Used (optional)"
          value={draft.skillsUsed ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, skillsUsed: v }))}
          placeholder="Excel, Canva, Data Analysis"
          colClass="col-md-6"
        />
        <TextField
          label="Project URL (optional)"
          value={draft.url ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, url: v }))}
          placeholder="github.com/juan/project"
          colClass="col-md-6"
        />
        <div className="col-12">
          <button
            type="button"
            className="btn btn-outline-ink"
            onClick={handleAdd}
            disabled={!canAdd}
          >
            + Add This Project
          </button>
        </div>
      </div>

      <FormNav onBack={goBack} onNext={goNext} />
    </div>
  );
}
