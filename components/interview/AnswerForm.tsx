"use client";

import { useActionState } from "react";
import { answerQuestionAction } from "@/app/actions/interview.actions";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function AnswerForm({ sessionId, questionId }: { sessionId: string; questionId: string }) {
  const [state, action] = useActionState(answerQuestionAction, {});
  return (
    <form action={action} noValidate>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="questionId" value={questionId} />
      <Field label="Your answer" name={`answer`} as="textarea" rows={5} state={state} hint="Aim for 60–120 words and include a real example." />
      <div className="d-flex flex-wrap align-items-center gap-3">
        <SubmitButton pendingText="Scoring…">Submit answer</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
