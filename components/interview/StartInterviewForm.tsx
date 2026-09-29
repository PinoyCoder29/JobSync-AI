"use client";

import { useActionState } from "react";
import { startInterviewAction } from "@/app/actions/interview.actions";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, keysOf } from "@/lib/labels";

export function StartInterviewForm({ defaultRole }: { defaultRole: string }) {
  const [state, action] = useActionState(startInterviewAction, {});
  return (
    <form action={action} noValidate>
      <Field label="Interview category" name="category" as="select" state={state} defaultValue="TECHNICAL">
        {keysOf(CATEGORY_LABEL).map((k) => <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>)}
      </Field>
      <Field label="Job role" name="jobRole" state={state} defaultValue={defaultRole} required />
      <Field label="Difficulty" name="difficulty" as="select" state={state} defaultValue="MEDIUM">
        {keysOf(DIFFICULTY_LABEL).map((k) => <option key={k} value={k}>{DIFFICULTY_LABEL[k]}</option>)}
      </Field>
      <div className="d-grid gap-2">
        <SubmitButton pendingText="Preparing questions…">Start practice session</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
