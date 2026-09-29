"use client";

import { useState } from "react";
import { useResume } from "@/context/ResumeContext";
import TextField from "@/components/fields/TextField";
import TextAreaField from "@/components/fields/TextAreaField";
import FormNav from "@/components/FormNav";
import { CertificationEntry, TrainingEntry } from "@/types/resume";

const emptyCertDraft: Omit<CertificationEntry, "id"> = {
  name: "",
  issuer: "",
  issueDate: "",
  expirationDate: "",
  credentialId: "",
  credentialUrl: "",
};

const emptyTrainingDraft: Omit<TrainingEntry, "id"> = {
  name: "",
  provider: "",
  date: "",
  description: "",
};

// Combines two optional sections into one step:
// professional certifications and shorter trainings/workshops/seminars.
export default function CertificationsForm() {
  const {
    data,
    addCertification,
    removeCertification,
    addTraining,
    removeTraining,
    goNext,
    goBack,
  } = useResume();

  const [certDraft, setCertDraft] = useState(emptyCertDraft);
  const [trainingDraft, setTrainingDraft] = useState(emptyTrainingDraft);

  const canAddCert =
    certDraft.name.trim() !== "" && certDraft.issuer.trim() !== "";

  const canAddTraining = trainingDraft.name.trim() !== "";

  const handleAddCert = () => {
    if (!canAddCert) return;

    addCertification({
      id: crypto.randomUUID(),
      ...certDraft,
    });

    setCertDraft(emptyCertDraft);
  };

  const handleAddTraining = () => {
    if (!canAddTraining) return;

    addTraining({
      id: crypto.randomUUID(),
      ...trainingDraft,
    });

    setTrainingDraft(emptyTrainingDraft);
  };

  return (
    <div className="panel">
      <h2 className="panel-title">Certifications &amp; Training (Optional)</h2>

      <p className="panel-subtitle">
        Add any relevant certifications, trainings, workshops, or seminars. If
        you do not have any, you can simply click Continue.
      </p>

      {/* Certifications */}
      <h3 className="h6 fw-semibold mt-2">Certifications</h3>

      {data.certifications.length > 0 && (
        <div className="mb-3">
          {data.certifications.map((cert) => (
            <div
              className="entry-row d-flex justify-content-between align-items-start"
              key={cert.id}
            >
              <div>
                <div className="fw-semibold">{cert.name}</div>

                <div className="text-secondary small">
                  {[cert.issuer, cert.issueDate].filter(Boolean).join(" · ")}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeCertification(cert.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="row g-3 border-top pt-3 mb-4">
        <TextField
          label="Certification Name"
          value={certDraft.name}
          onChange={(v) => setCertDraft((d) => ({ ...d, name: v }))}
          placeholder="Certified Bookkeeper"
          required
          colClass="col-md-6"
        />

        <TextField
          label="Issuing Organization"
          value={certDraft.issuer}
          onChange={(v) => setCertDraft((d) => ({ ...d, issuer: v }))}
          placeholder="PICPA"
          required
          colClass="col-md-6"
        />

        <TextField
          label="Issue Date (optional)"
          value={certDraft.issueDate ?? ""}
          onChange={(v) => setCertDraft((d) => ({ ...d, issueDate: v }))}
          placeholder="Mar 2024"
          colClass="col-md-4"
        />

        <TextField
          label="Expiration Date (optional)"
          value={certDraft.expirationDate ?? ""}
          onChange={(v) => setCertDraft((d) => ({ ...d, expirationDate: v }))}
          placeholder="Mar 2027"
          colClass="col-md-4"
        />

        <TextField
          label="Credential ID (optional)"
          value={certDraft.credentialId ?? ""}
          onChange={(v) => setCertDraft((d) => ({ ...d, credentialId: v }))}
          placeholder="ABC-12345"
          colClass="col-md-4"
        />

        <TextField
          label="Credential URL (optional)"
          value={certDraft.credentialUrl ?? ""}
          onChange={(v) => setCertDraft((d) => ({ ...d, credentialUrl: v }))}
          placeholder="https://credential.example.com/abc123"
          colClass="col-md-12"
        />

        <div className="col-12">
          <button
            type="button"
            className="btn btn-outline-ink"
            onClick={handleAddCert}
            disabled={!canAddCert}
          >
            + Add This Certification
          </button>
        </div>
      </div>

      {/* Training & Workshops */}
      <h3 className="h6 fw-semibold mt-2">Training &amp; Workshops</h3>

      {data.trainings.length > 0 && (
        <div className="mb-3">
          {data.trainings.map((training) => (
            <div
              className="entry-row d-flex justify-content-between align-items-start"
              key={training.id}
            >
              <div>
                <div className="fw-semibold">{training.name}</div>

                <div className="text-secondary small">
                  {[training.provider, training.date]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => removeTraining(training.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="row g-3 border-top pt-3">
        <TextField
          label="Training / Workshop Name"
          value={trainingDraft.name}
          onChange={(v) => setTrainingDraft((d) => ({ ...d, name: v }))}
          placeholder="Basic Occupational Safety and Health Training"
          required
          colClass="col-md-6"
        />

        <TextField
          label="Provider (optional)"
          value={trainingDraft.provider ?? ""}
          onChange={(v) => setTrainingDraft((d) => ({ ...d, provider: v }))}
          placeholder="DOLE"
          colClass="col-md-6"
        />

        <TextField
          label="Date (optional)"
          value={trainingDraft.date ?? ""}
          onChange={(v) => setTrainingDraft((d) => ({ ...d, date: v }))}
          placeholder="Aug 2024"
          colClass="col-md-6"
        />

        <TextAreaField
          label="Description (optional)"
          value={trainingDraft.description ?? ""}
          onChange={(v) => setTrainingDraft((d) => ({ ...d, description: v }))}
          placeholder="Briefly describe the training, workshop, or seminar."
          rows={2}
        />

        <div className="col-12">
          <button
            type="button"
            className="btn btn-outline-ink"
            onClick={handleAddTraining}
            disabled={!canAddTraining}
          >
            + Add This Training
          </button>
        </div>
      </div>

      <FormNav onBack={goBack} onNext={goNext} />
    </div>
  );
}
