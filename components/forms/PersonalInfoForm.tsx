"use client";

import { useResume } from "@/context/ResumeContext";
import TextField from "@/components/fields/TextField";
import TextAreaField from "@/components/fields/TextAreaField";
import FormNav from "@/components/FormNav";

export default function PersonalInfoForm() {
  const { data, updatePersonalInfo, goNext } = useResume();
  const info = data.personalInfo;

  const canContinue =
    info.fullName.trim() !== "" &&
    info.email.trim() !== "" &&
    info.phone.trim() !== "";

  return (
    <div className="panel">
      <h2 className="panel-title">Personal Information</h2>

      <p className="panel-subtitle">
        This information will appear at the top of your resume. Use your full
        name and an active email address and phone number where employers can
        easily reach you.
      </p>

      <div className="row g-3">
        {/* Full Name */}
        <TextField
          label="Full Name"
          value={info.fullName}
          onChange={(v) => updatePersonalInfo({ fullName: v })}
          placeholder="Juan Dela Cruz"
          required
          colClass="col-md-6"
        />

        {/* Target Job Title */}
        <TextField
          label="Target Job Title"
          value={info.jobTitle}
          onChange={(v) => updatePersonalInfo({ jobTitle: v })}
          placeholder="Customer Service Representative"
          colClass="col-md-6"
          helpText="The position you are targeting in your job application."
        />

        {/* Email */}
        <TextField
          label="Email Address"
          value={info.email}
          onChange={(v) => updatePersonalInfo({ email: v })}
          placeholder="juan.delacruz@email.com"
          type="email"
          required
          colClass="col-md-6"
        />

        {/* Phone */}
        <TextField
          label="Phone Number"
          value={info.phone}
          onChange={(v) => updatePersonalInfo({ phone: v })}
          placeholder="0917 123 4567"
          required
          colClass="col-md-6"
        />

        {/* Location */}
        <TextField
          label="Location"
          value={info.location}
          onChange={(v) => updatePersonalInfo({ location: v })}
          placeholder="Sariaya, Quezon Province"
          colClass="col-md-6"
        />

        {/* LinkedIn */}
        <TextField
          label="LinkedIn (optional)"
          value={info.linkedin ?? ""}
          onChange={(v) => updatePersonalInfo({ linkedin: v })}
          placeholder="linkedin.com/in/juandelacruz"
          colClass="col-md-6"
        />

        {/* GitHub */}
        <TextField
          label="GitHub (optional)"
          value={info.github ?? ""}
          onChange={(v) => updatePersonalInfo({ github: v })}
          placeholder="github.com/juandelacruz"
          colClass="col-md-6"
          helpText="Add your GitHub profile to showcase your projects and code."
        />

        {/* Portfolio */}
        <TextField
          label="Portfolio Website (optional)"
          value={info.portfolio ?? ""}
          onChange={(v) => updatePersonalInfo({ portfolio: v })}
          placeholder="juandelacruz.dev"
          colClass="col-md-6"
          helpText="Your personal website, portfolio, or project showcase."
        />

        {/* Professional Summary */}
        <TextAreaField
          label="Professional Summary"
          value={info.summary}
          onChange={(v) => updatePersonalInfo({ summary: v })}
          placeholder="Write 2–3 sentences summarizing who you are, your experience, and the value you can bring to the employer."
          rows={4}
          colClass="col-12"
        />
      </div>

      <FormNav onNext={goNext} nextDisabled={!canContinue} hideBack />
    </div>
  );
}
