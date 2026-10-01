"use client";

import { Button, cx, Modal, Notice } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import type { DuplicateInstitutionGroup } from "@/lib/types";

import styles from "./admin.module.css";

export type MergeConfirmState = { group: DuplicateInstitutionGroup; primaryId: string; duplicateId: string };

export function MergeModal({
  mergeConfirm,
  onChange,
  onClose,
  onConfirm,
  isMerging,
  error,
}: {
  mergeConfirm: MergeConfirmState;
  onChange(next: MergeConfirmState): void;
  onClose(): void;
  onConfirm(): void;
  isMerging: boolean;
  error: string | null;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Merge institutions"
      title="Confirm institution merge"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isMerging}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isMerging}>
            {isMerging ? "Merging..." : "Merge institutions"}
          </Button>
        </>
      }
    >
      <div className={styles.stack}>
        <p className={styles.bodyText}>
          All users, listings, requests, and board posts from the duplicate institution will be reassigned
          to the primary institution. The duplicate will be permanently deleted.
        </p>

        <div className={styles.mergeOptions} role="radiogroup" aria-label="Primary institution">
          {mergeConfirm.group.institutions.map((inst) => (
            <label key={inst.id} className={cx(styles.mergeOption, mergeConfirm.primaryId === inst.id && styles.mergeOptionSelected)}>
              <input
                type="radio"
                className="sr-only"
                name="primary-institution"
                value={inst.id}
                checked={mergeConfirm.primaryId === inst.id}
                onChange={() =>
                  onChange({
                    ...mergeConfirm,
                    primaryId: inst.id,
                    duplicateId: mergeConfirm.group.institutions.find((i) => i.id !== inst.id)?.id ?? "",
                  })
                }
              />
              <span className={styles.mergeName}>{inst.name}</span>
              <span className={styles.duplicateMeta}>{inst.location}</span>
              <span className={styles.mergeTags}>
                <StatusPill status={inst.verification_status} />
                <span className={styles.mergeRole}>{mergeConfirm.primaryId === inst.id ? "Primary (keep)" : "Duplicate (delete)"}</span>
              </span>
            </label>
          ))}
        </div>

        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>
    </Modal>
  );
}
