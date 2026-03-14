import { titleCaseStatus } from "@/lib/format";

export function StatusPill({ status }: { status: string }) {
  return <span className={`status-pill status-${status}`}>{titleCaseStatus(status)}</span>;
}

