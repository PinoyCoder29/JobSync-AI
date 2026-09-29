import type { ApplicationStatus } from "@prisma/client";
import { STATUS_LABEL } from "@/lib/labels";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>;
}
