import { toggleSaveJobAction } from "@/app/actions/jobs.actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function SaveJobButton({ jobId, saved }: { jobId: string; saved: boolean }) {
  return (
    <form action={toggleSaveJobAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <SubmitButton className={`btn btn-sm ${saved ? "btn-soft" : "btn-outline-brand"}`} pendingText={saved ? "Removing…" : "Saving…"}>
        <i className={`bi ${saved ? "bi-bookmark-fill" : "bi-bookmark"} me-1`} aria-hidden="true" />
        {saved ? "Saved" : "Save"}
      </SubmitButton>
    </form>
  );
}
