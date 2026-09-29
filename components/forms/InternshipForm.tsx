"use client";

import { useState } from "react";
import { useResume } from "@/context/ResumeContext";
import TextField from "@/components/fields/TextField";
import TextAreaField from "@/components/fields/TextAreaField";
import FormNav from "@/components/FormNav";
import { InternshipEntry } from "@/types/resume";

const emptyDraft: Omit<InternshipEntry, "id"> = {
  position: "",
  company: "",
  department: "",
  location: "",
  startDate: "",
  endDate: "",
  description: "",
};

// Always optional — applicable to any course, and skippable whether or
// not the user already answered "yes" on the work-experience question.
export default function InternshipForm() {
  const { data, addInternship, removeInternship, goNext, goBack } = useResume();
  const [draft, setDraft] = useState(emptyDraft);

  const canAdd = draft.position.trim() !== "" && draft.company.trim() !== "";

  const handleAdd = () => {
    if (!canAdd) return;
    addInternship({ id: crypto.randomUUID(), ...draft });
    setDraft(emptyDraft);
  };

  return (
    <div className="panel">
      <h2 className="panel-title">
        Internship / On-the-Job Training (Optional)
      </h2>

      <p className="panel-subtitle">
        Add your internship or OJT experience if you have one — this section is
        applicable to any course. If you don't have one, simply click "Skip this
        section" below.
      </p>

      {data.internship.length > 0 && (
        <div className="mb-4">
          {data.internship.map((intern) => (
            <div
              className="entry-row d-flex justify-content-between align-items-start"
              key={intern.id}
            >
              <div>
                <div className="fw-semibold">
                  {intern.position} · {intern.company}
                </div>

                <div className="text-secondary small">
                  {intern.startDate} – {intern.endDate}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeInternship(intern.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="row g-3 border-top pt-3">
        <TextField
          label="Position"
          value={draft.position}
          onChange={(v) => setDraft((d) => ({ ...d, position: v }))}
          placeholder="Marketing Intern"
          required
          colClass="col-md-6"
        />

        <TextField
          label="Company / Organization"
          value={draft.company}
          onChange={(v) => setDraft((d) => ({ ...d, company: v }))}
          placeholder="ABC Corporation"
          required
          colClass="col-md-6"
        />

        <TextField
          label="Department (optional)"
          value={draft.department ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, department: v }))}
          placeholder="Human Resources"
          colClass="col-md-6"
        />

        <TextField
          label="Location (optional)"
          value={draft.location ?? ""}
          onChange={(v) => setDraft((d) => ({ ...d, location: v }))}
          placeholder="Lipa City, Batangas"
          colClass="col-md-6"
        />

        <TextField
          label="Start Date"
          value={draft.startDate}
          onChange={(v) => setDraft((d) => ({ ...d, startDate: v }))}
          placeholder="Jan 2025"
          colClass="col-md-6"
        />

        <TextField
          label="End Date"
          value={draft.endDate}
          onChange={(v) => setDraft((d) => ({ ...d, endDate: v }))}
          placeholder="Apr 2025"
          colClass="col-md-6"
        />

        <TextAreaField
          label="Responsibilities / Skills Learned"
          value={draft.description}
          onChange={(v) => setDraft((d) => ({ ...d, description: v }))}
          placeholder={
            "One bullet point per line, e.g.:\nAssisted in preparing monthly reports\nLearned how to use CRM software"
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
            + Add This Internship
          </button>
        </div>
      </div>

      <FormNav onBack={goBack} onNext={goNext} />
    </div>
  );
}
