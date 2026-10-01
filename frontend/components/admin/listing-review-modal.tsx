"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, buttonClass, Card, Field, Modal, Notice, Select, Textarea } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { formatDate, titleCaseStatus } from "@/lib/format";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { InternalListingDetailResponse, Listing } from "@/lib/types";

import styles from "./admin.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const supabase = createSupabaseBrowserClient();

export function ListingReviewModal({
  listing,
  onClose,
}: {
  listing: Listing;
  onClose: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(listing.status);
  const [adminNote, setAdminNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemovalConfirmOpen, setIsRemovalConfirmOpen] = useState(false);
  const [detail, setDetail] = useState<InternalListingDetailResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw new Error(sessionError.message);
        }

        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("You must be signed in as an admin to review this listing.");
        }

        const response = await fetch(`${API_BASE_URL}/admin/listings/${listing.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          let message = "Could not load the listing review details.";
          try {
            const body = (await response.json()) as { detail?: string };
            if (body.detail) {
              message = body.detail;
            }
          } catch {}
          throw new Error(message);
        }

        setDetail((await response.json()) as InternalListingDetailResponse);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load the listing review details.");
      } finally {
        setIsDetailLoading(false);
      }
    })();
  }, [listing.id]);

  const reviewListing = detail?.listing ?? listing;
  const documents = detail?.documents ?? [];

  async function submitStatusUpdate() {
    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in as an admin to update listing status.");
      }

      const response = await fetch(`${API_BASE_URL}/admin/listings/${listing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status, admin_note: adminNote.trim() || undefined }),
      });

      if (!response.ok) {
        let message = "Could not update the listing status.";
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
      return true;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not update the listing status.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status === "removed_by_admin") {
      setIsRemovalConfirmOpen(true);
      return;
    }

    await submitStatusUpdate();
  }

  return (
    <Modal open onClose={onClose} wide eyebrow="Listing review" title={reviewListing.title}>
      <div className={styles.reviewLayout}>
        <div className={styles.reviewImage}>
          {reviewListing.photo_urls[0] ? (
            <Image
              src={reviewListing.photo_urls[0]}
              alt={reviewListing.title}
              fill
              sizes="(max-width: 900px) 100vw, 40vw"
              className={styles.reviewImageImg}
            />
          ) : (
            <div className={styles.reviewImageEmpty}>No image uploaded</div>
          )}
        </div>

        <div className={styles.stack}>
          <div className={styles.topline}>
            <span className={styles.toplineLabel}>{reviewListing.category}</span>
            <StatusPill status={reviewListing.status} />
          </div>
          <p className={styles.bodyText}>{reviewListing.description}</p>

          <div className={styles.facts}>
            <div className={styles.fact}>
              <div className={styles.factLabel}>Condition</div>
              <div className={styles.factValue}>{titleCaseStatus(reviewListing.condition)}</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.factLabel}>Quantity</div>
              <div className={styles.factValue}>{reviewListing.quantity}</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.factLabel}>Location</div>
              <div className={styles.factValue}>{reviewListing.location}</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.factLabel}>Posted</div>
              <div className={styles.factValue}>{formatDate(reviewListing.created_at)}</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.factLabel}>Availability window</div>
              <div className={styles.factValue}>{reviewListing.availability_window}</div>
            </div>
            <div className={styles.fact}>
              <div className={styles.factLabel}>Request count</div>
              <div className={styles.factValue}>{reviewListing.request_count}</div>
            </div>
          </div>

          <section className={styles.subsection}>
            <h3 className={styles.subheading}>Operational details</h3>
            <dl className={styles.specGrid}>
              <div>
                <dt>Handling requirements</dt>
                <dd>{reviewListing.handling_requirements}</dd>
              </div>
              <div>
                <dt>Dimensions and weight</dt>
                <dd>{reviewListing.dimensions_weight}</dd>
              </div>
              <div>
                <dt>Working status</dt>
                <dd>{reviewListing.working_status}</dd>
              </div>
              <div>
                <dt>Documentation included</dt>
                <dd>{reviewListing.documentation_included}</dd>
              </div>
              <div>
                <dt>Special handling flags</dt>
                <dd>{reviewListing.special_handling_flags}</dd>
              </div>
              <div>
                <dt>Delivery mode</dt>
                <dd>{reviewListing.delivery_mode.replaceAll("_", " ")}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.subsection}>
            <h3 className={styles.subheading}>Compliance Forms</h3>
            {isDetailLoading ? <p className={styles.bodyText}>Loading compliance documents...</p> : null}
            {!isDetailLoading && documents.length === 0 ? (
              <p className={styles.bodyText}>No compliance PDFs are attached to this listing.</p>
            ) : null}
            {!isDetailLoading && documents.length > 0 ? (
              <div className={styles.documents}>
                {documents.map((document) => (
                  <Card key={document.form_type} as="article" className={styles.documentCard}>
                    <div className={styles.documentHead}>
                      <div>
                        <h4 className={styles.documentTitle}>{document.title}</h4>
                        <p className={styles.documentMeta}>
                          {document.completed_by_name
                            ? `Completed by ${document.completed_by_name}`
                            : "Not yet completed"}
                          {document.completed_at
                            ? ` on ${new Date(document.completed_at).toLocaleDateString()}`
                            : ""}
                        </p>
                      </div>
                      <StatusPill status={document.status} />
                    </div>

                    {document.preview_url ? (
                      <iframe
                        title={`${document.title} preview`}
                        src={document.preview_url}
                        className={styles.documentPreview}
                      />
                    ) : (
                      <div className={styles.documentPreviewEmpty}>No PDF preview available</div>
                    )}

                    {document.download_url ? (
                      <div className={styles.documentActions}>
                        <a
                          className={buttonClass({ variant: "secondary", size: "sm" })}
                          href={document.download_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download PDF
                        </a>
                      </div>
                    ) : null}
                  </Card>
                ))}
              </div>
            ) : null}
          </section>

          <form onSubmit={handleSubmit} className={styles.form}>
            <Field label="Change Listing Status" htmlFor={`listing-status-${reviewListing.id}`}>
              <Select
                id={`listing-status-${reviewListing.id}`}
                name="status"
                value={status}
                onChange={(event) => setStatus(event.target.value as Listing["status"])}
              >
                {reviewListing.status !== "matched_reserved" && reviewListing.status !== "rejected" ? (
                  <option value="pending_admin_approval">Pending</option>
                ) : null}
                {reviewListing.status === "pending_admin_approval" ? (
                  <option value="rejected">Rejected</option>
                ) : null}
                {reviewListing.status !== "matched_reserved" && reviewListing.status !== "rejected" ? (
                  <option value="live">Approved</option>
                ) : null}
                {reviewListing.status === "rejected" ? <option value="rejected">Rejected</option> : null}
                {reviewListing.status === "matched_reserved" ? <option value="matched_reserved">Match reserved</option> : null}
                <option value="removed_by_admin">Remove from marketplace</option>
              </Select>
            </Field>
            <Field label="Admin note" htmlFor={`listing-note-${reviewListing.id}`}>
              <Textarea
                id={`listing-note-${reviewListing.id}`}
                name="adminNote"
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                rows={3}
                placeholder="Optional note included in the donor notification"
              />
            </Field>
            <div className={styles.formActions}>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update status"}
              </Button>
            </div>
          </form>
          {error ? <Notice tone="error">{error}</Notice> : null}

          {isRemovalConfirmOpen ? (
            <section className={styles.confirm} aria-labelledby={`listing-removal-${reviewListing.id}`}>
              <span className={styles.confirmEyebrow}>Confirm removal</span>
              <h3 id={`listing-removal-${reviewListing.id}`} className={styles.subheading}>
                Are you sure you want to remove this listing from the marketplace?
              </h3>
              <p className={styles.bodyText}>
                This will hide the listing from normal marketplace views and mark it as removed by admin. The listing
                record will still remain in the system.
              </p>
              <div className={styles.formActions}>
                <Button variant="secondary" onClick={() => setIsRemovalConfirmOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    void submitStatusUpdate().then((didSucceed) => {
                      if (didSucceed) {
                        setIsRemovalConfirmOpen(false);
                      }
                    });
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Removing..." : "Yes, remove listing"}
                </Button>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
