"use client";

import { useState } from "react";
import { useResume } from "@/context/ResumeContext";
import TextField from "@/components/fields/TextField";
import TextAreaField from "@/components/fields/TextAreaField";
import FormNav from "@/components/FormNav";
import { EducationEntry } from "@/types/resume";

const emptyDraft: Omit<EducationEntry, "id"> = {
  school: "",
  degree: "",
  location: "",
  startDate: "",
  endDate: "",
  honors: "",
  summary: "",
};

export default function EducationForm() {
  const { data, addEducation, removeEducation, goNext, goBack } = useResume();
  const [draft, setDraft] = useState(emptyDraft);

  const canAdd = draft.school.trim() !== "" && draft.degree.trim() !== "";

  const handleAdd = () => {
    if (!canAdd) return;
    addEducation({ id: crypto.randomUUID(), ...draft });
    setDraft(emptyDraft);
  };

  const canContinue = data.education.length > 0;

  return (
    <div className="panel">
      <h2 className="panel-title">Education</h2>

      <p className="panel-subtitle">
        Enter your highest or most recently completed program first. If you are
        a fresh graduate, you can also add relevant coursework or your thesis
        title.
      </p>

      {data.education.length > 0 && (
        <div className="mb-4">
          {data.education.map((edu) => (
            <div
              className="entry-row d-flex justify-content-between align-items-start"
              key={edu.id}
            >
              <div>
                <div className="fw-semibold">{edu.degree}</div>
                <div className="text-secondary small">
                  {edu.school} · {edu.startDate} – {edu.endDate}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeEducation(edu.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="row g-3 border-top pt-3">
        <TextField
          label="School / University"
          value={draft.school}
          onChange={(v) => setDraft((d) => ({ ...d, school: v }))}
          placeholder="Batangas State University"
          required
          colClass="col-md-6"
        />

        <TextField
          label="Degree / Program"
          value={draft.degree}
          onChange={(v) => setDraft((d) => ({ ...d, degree: v }))}
          placeholder="BS Information Technology"
          required
          colClass="col-md-6"
        />

        <TextField
          label="Start Year"
          value={draft.startDate}
          onChange={(v) => setDraft((d) => ({ ...d, startDate: v }))}
          placeholder="2021"
          colClass="col-md-4"
        />

        <TextField
          label="End Year"
          value={draft.endDate}
          onChange={(v) => setDraft((d) => ({ ...d, endDate: v }))}
          placeholder="2025"
          colClass="col-md-4"
        />

        <TextField
          label="Honors (optional)"
          value={draft.honors ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, honors: v }))}
          placeholder="Cum Laude, Dean's List"
          colClass="col-md-4"
        />

        <TextAreaField
          label="Education Summary (optional)"
          value={draft.summary ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, summary: v }))}
          placeholder="Briefly describe your specialization, skills learned, academic achievements, or relevant work completed during your studies."
          rows={3}
          colClass="col-12"
        />

        <div className="col-12">
          <button
            type="button"
            className="btn btn-outline-ink"
            onClick={handleAdd}
            disabled={!canAdd}
          >
            + Add This Education
          </button>
        </div>
      </div>

      <FormNav onBack={goBack} onNext={goNext} nextDisabled={!canContinue} />
    </div>
  );
}
