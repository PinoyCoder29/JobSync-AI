"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/profile.actions";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ARRANGEMENT_LABEL, keysOf } from "@/lib/labels";

export type ProfileFormValues = {
  name: string;
  headline: string;
  summary: string;
  location: string;
  targetRoles: string;
  preferredWorkArrangement: string;
  preferredLocations: string;
  salaryMin: string;
  salaryMax: string;
  portfolioUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  skills: string;
};

export function ProfileForm({ values }: { values: ProfileFormValues }) {
  const [state, action] = useActionState(updateProfileAction, {});
  return (
    <form action={action} noValidate>
      <h2 className="section-title">About you</h2>
      <div className="row">
        <Field
          className="col-md-6 mb-3"
          label="Full name"
          name="name"
          state={state}
          defaultValue={values.name}
          required
          autoComplete="name"
        />
        <Field
          className="col-md-6 mb-3"
          label="Headline"
          name="headline"
          state={state}
          defaultValue={values.headline}
          placeholder="e.g. Aspiring Full Stack Developer"
        />
        <Field
          className="col-12 mb-3"
          label="Summary"
          name="summary"
          as="textarea"
          rows={4}
          state={state}
          defaultValue={values.summary}
          hint="Up to 1,000 characters."
        />
        <Field
          className="col-md-6 mb-3"
          label="Location"
          name="location"
          state={state}
          defaultValue={values.location}
        />
        <Field
          className="col-md-6 mb-3"
          label="Skills"
          name="skills"
          state={state}
          defaultValue={values.skills}
          hint="Comma separated, e.g. React, TypeScript, PostgreSQL"
        />
      </div>

      <h2 className="section-title mt-3">Job preferences</h2>
      <div className="row">
        <Field
          className="col-md-6 mb-3"
          label="Target roles"
          name="targetRoles"
          state={state}
          defaultValue={values.targetRoles}
          hint="Comma separated"
        />
        <Field
          className="col-md-6 mb-3"
          label="Preferred work arrangement"
          name="preferredWorkArrangement"
          as="select"
          state={state}
          defaultValue={values.preferredWorkArrangement}
        >
          <option value="">No preference</option>
          {keysOf(ARRANGEMENT_LABEL).map((k) => (
            <option key={k} value={k}>
              {ARRANGEMENT_LABEL[k]}
            </option>
          ))}
        </Field>
        <Field
          className="col-12 mb-3"
          label="Preferred locations"
          name="preferredLocations"
          state={state}
          defaultValue={values.preferredLocations}
          hint="Comma separated, e.g. Makati, Taguig"
        />
        <Field
          className="col-md-6 mb-3"
          label="Expected monthly salary – minimum (PHP)"
          name="salaryMin"
          type="number"
          state={state}
          defaultValue={values.salaryMin}
        />
        <Field
          className="col-md-6 mb-3"
          label="Expected monthly salary – maximum (PHP)"
          name="salaryMax"
          type="number"
          state={state}
          defaultValue={values.salaryMax}
        />
      </div>

      <h2 className="section-title mt-3">Links</h2>
      <div className="row">
        <Field
          className="col-md-4 mb-3"
          label="Portfolio"
          name="portfolioUrl"
          type="url"
          state={state}
          defaultValue={values.portfolioUrl}
          placeholder="https://"
        />
        <Field
          className="col-md-4 mb-3"
          label="GitHub"
          name="githubUrl"
          type="url"
          state={state}
          defaultValue={values.githubUrl}
          placeholder="https://github.com/…"
        />
        <Field
          className="col-md-4 mb-3"
          label="LinkedIn"
          name="linkedinUrl"
          type="url"
          state={state}
          defaultValue={values.linkedinUrl}
          placeholder="https://linkedin.com/in/…"
        />
      </div>

      <div className="d-flex flex-wrap align-items-center gap-3">
        <SubmitButton>Save profile</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
