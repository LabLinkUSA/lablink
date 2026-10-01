"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Field, Modal, Notice, Select, Textarea } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Institution } from "@/lib/types";

import styles from "./admin.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const supabase = createSupabaseBrowserClient();

export function InstitutionReviewModal({
  institution,
  onClose,
}: {
  institution: Institution;
  onClose: () => void;
}) {
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState(institution.verification_status);
  const [adminNote, setAdminNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in as an admin to update institution status.");
      }

      const response = await fetch(`${API_BASE_URL}/admin/institutions/${institution.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ verification_status: verificationStatus, admin_note: adminNote.trim() || undefined }),
      });

      if (!response.ok) {
        let message = "Could not update the institution status.";
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) {
            message = body.detail;
          }
        } catch {}
        throw new Error(message);
      }

      router.refresh();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not update the institution status.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} eyebrow="Institution review" title={institution.name}>
      <div className={styles.stack}>
        <div className={styles.topline}>
          <span className={styles.toplineLabel}>{institution.type.replaceAll("_", " ")}</span>
          <StatusPill status={institution.verification_status} />
        </div>
        <p className={styles.bodyText}>{institution.description}</p>

        <div className={styles.facts}>
          <div className={styles.fact}>
            <div className={styles.factLabel}>Location</div>
            <div className={styles.factValue}>{institution.location}</div>
          </div>
          <div className={styles.fact}>
            <div className={styles.factLabel}>Institution ID</div>
            <div className={styles.factValue}>{institution.id}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Field label="Verification status" htmlFor={`institution-status-${institution.id}`}>
            <Select
              id={`institution-status-${institution.id}`}
              name="verificationStatus"
              value={verificationStatus}
              onChange={(event) => setVerificationStatus(event.target.value as Institution["verification_status"])}
            >
              <option value="pending_verification">Pending verification</option>
              <option value="verified">Verify institution</option>
              <option value="rejected">Reject institution</option>
              <option value="suspended">Suspend institution</option>
            </Select>
          </Field>
          <Field label="Admin note" htmlFor={`institution-note-${institution.id}`}>
            <Textarea
              id={`institution-note-${institution.id}`}
              name="adminNote"
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              rows={3}
              placeholder="Optional note included in the institution notification"
            />
          </Field>
          <div className={styles.formActions}>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating…" : "Update status"}
            </Button>
          </div>
        </form>
        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>
    </Modal>
  );
}
