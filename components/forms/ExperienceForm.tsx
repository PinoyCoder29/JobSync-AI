"use client";

import { useState } from "react";
import { useResume } from "@/context/ResumeContext";
import TextField from "@/components/fields/TextField";
import TextAreaField from "@/components/fields/TextAreaField";
import FormNav from "@/components/FormNav";
import { ExperienceEntry } from "@/types/resume";

const emptyDraft: Omit<ExperienceEntry, "id"> = {
  company: "",
  position: "",
  location: "",
  startDate: "",
  endDate: "",
  description: "",
};

export default function ExperienceForm() {
  const { data, addExperience, removeExperience, goNext, goBack } = useResume();
  const [draft, setDraft] = useState(emptyDraft);

  const canAdd =
    draft.company.trim() !== "" &&
    draft.position.trim() !== "" &&
    draft.startDate.trim() !== "";

  const handleAdd = () => {
    if (!canAdd) return;
    addExperience({ id: crypto.randomUUID(), ...draft });
    setDraft(emptyDraft);
  };

  const canContinue = data.experience.length > 0;

  return (
    <div className="panel">
      <h2 className="panel-title">Work Experience</h2>

      <p className="panel-subtitle">
        Add your work experience, starting with your most recent position. Use
        action verbs and, when possible, include numbers or measurable results
        in your description (e.g., "Processed 50+ orders daily").
      </p>

      {data.experience.length > 0 && (
        <div className="mb-4">
          {data.experience.map((exp) => (
            <div
              className="entry-row d-flex justify-content-between align-items-start"
              key={exp.id}
            >
              <div>
                <div className="fw-semibold">
                  {exp.position} · {exp.company}
                </div>

                <div className="text-secondary small">
                  {exp.startDate} – {exp.endDate}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeExperience(exp.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="row g-3 border-top pt-3">
        <TextField
          label="Company Name"
          value={draft.company}
          onChange={(v) => setDraft((d) => ({ ...d, company: v }))}
          placeholder="ABC Corporation"
          required
          colClass="col-md-6"
        />

        <TextField
          label="Job Title"
          value={draft.position}
          onChange={(v) => setDraft((d) => ({ ...d, position: v }))}
          placeholder="Sales Associate"
          required
          colClass="col-md-6"
        />

        <TextField
          label="Start Date"
          value={draft.startDate}
          onChange={(v) => setDraft((d) => ({ ...d, startDate: v }))}
          placeholder="Jun 2022"
          required
          colClass="col-md-6"
        />

        <TextField
          label="End Date"
          value={draft.endDate}
          onChange={(v) => setDraft((d) => ({ ...d, endDate: v }))}
          placeholder="Present"
          colClass="col-md-6"
        />

        <TextAreaField
          label="Key Responsibilities / Achievements"
          value={draft.description}
          onChange={(v) => setDraft((d) => ({ ...d, description: v }))}
          placeholder={
            "One bullet point per line, e.g.:\nHandled 30+ customer inquiries per shift\nHelped increase sales by 15% in Q2"
          }
          rows={4}
        />

        <div className="col-12">
          <button
            type="button"
            className="btn btn-outline-ink"
            onClick={handleAdd}
            disabled={!canAdd}
          >
            + Add This Experience
          </button>
        </div>
      </div>

      <FormNav onBack={goBack} onNext={goNext} nextDisabled={!canContinue} />
    </div>
  );
}
