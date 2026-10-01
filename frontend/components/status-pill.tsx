import { cx } from "@/components/ui/cx";
import styles from "@/components/ui/status-pill.module.css";
import { titleCaseStatus } from "@/lib/format";

const POSITIVE = new Set(["live", "verified", "approved_matched", "completed", "fulfilled", "active", "open"]);
const PENDING = new Set(["draft", "submitted", "admin_review", "pending_verification", "pending_admin_approval", "listing_under_review", "pending_request", "match_in_progress"]);
const NEGATIVE = new Set(["rejected", "rejected_cancelled", "removed_by_admin", "removed_by_donor", "suspended"]);

export function statusTone(status: string): "positive" | "pending" | "neutral" | "negative" {
  if (POSITIVE.has(status)) return "positive";
  if (PENDING.has(status)) return "pending";
  if (NEGATIVE.has(status)) return "negative";
  return "neutral";
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const tone = statusTone(status);
  return (
    <span data-tone={tone} className={cx("status-pill", `status-${status}`, styles.pill, styles[tone], className)}>
      <span className={styles.dot} aria-hidden="true" />
      {titleCaseStatus(status)}
    </span>
  );
}
