"use client";

import { useActionState } from "react";
import { changeStatusAction } from "@/app/actions/applications.actions";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { STATUS_LABEL, keysOf } from "@/lib/labels";

export function StatusForm({ applicationId, current }: { applicationId: string; current: string }) {
  const [state, action] = useActionState(changeStatusAction, {});
  return (
    <form action={action} className="status-form">
      <input type="hidden" name="applicationId" value={applicationId} />
      <div className="row g-2 align-items-end">
        <div className="col-sm-4">
          <label htmlFor={`st-${applicationId}`} className="form-label small mb-1">Move to</label>
          <select id={`st-${applicationId}`} name="status" className="form-select form-select-sm" defaultValue={current}>
            {keysOf(STATUS_LABEL).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div className="col-sm-5">
          <label htmlFor={`nt-${applicationId}`} className="form-label small mb-1">Note (optional)</label>
          <input id={`nt-${applicationId}`} name="note" className="form-control form-control-sm" maxLength={500} />
        </div>
        <div className="col-sm-3"><SubmitButton className="btn btn-outline-brand btn-sm w-100" pendingText="Updating…">Update</SubmitButton></div>
      </div>
      <div className="mt-2"><FormMessage state={state} /></div>
    </form>
  );
}
