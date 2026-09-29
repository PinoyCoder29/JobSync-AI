"use client";

import { useActionState, useEffect, useRef } from "react";
import { createApplicationAction } from "@/app/actions/applications.actions";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { STATUS_LABEL, keysOf } from "@/lib/labels";

export function ApplicationForm() {
  const [state, action] = useActionState(createApplicationAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form ref={ref} action={action} noValidate>
      <div className="row">
        <Field className="col-md-6 mb-3" label="Company" name="company" state={state} required />
        <Field className="col-md-6 mb-3" label="Position" name="position" state={state} required />
        <Field className="col-md-6 mb-3" label="Date applied" name="appliedAt" type="date" state={state} defaultValue={today} required />
        <Field className="col-md-6 mb-3" label="Status" name="status" as="select" state={state} defaultValue="APPLIED">
          {keysOf(STATUS_LABEL).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </Field>
        <Field className="col-md-6 mb-3" label="Next step" name="nextStep" state={state} placeholder="e.g. Technical interview on Friday" />
        <Field className="col-md-6 mb-3" label="Job link" name="jobUrl" type="url" state={state} placeholder="https://" />
        <Field className="col-12 mb-3" label="Notes" name="notes" as="textarea" state={state} rows={2} />
      </div>
      <div className="d-flex flex-wrap align-items-center gap-3">
        <SubmitButton pendingText="Adding…">Add application</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
