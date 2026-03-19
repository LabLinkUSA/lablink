"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardPanel } from "@/components/dashboard-panel";
import { ListingListRow } from "@/components/listing-list-row";
import { StatusPill } from "@/components/status-pill";
import { updateInstitutionStatusAction } from "@/app/admin/actions";
import { formatDate } from "@/lib/format";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AdminDashboardResponse, Institution, Listing } from "@/lib/types";

type AdminReviewDashboardProps = {
  dashboard: AdminDashboardResponse;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const supabase = createSupabaseBrowserClient();

export function AdminReviewDashboard({ dashboard }: AdminReviewDashboardProps) {
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  return (
    <>
      <div className="dashboard-grid">
        <DashboardPanel title="Institution verification queue" subtitle="Review and manage every institution regardless of verification status.">
          <div className="list">
            {dashboard.pending_institutions.map((institution) => (
              <button
                key={institution.id}
                type="button"
                className="list-row review-trigger"
                onClick={() => setSelectedInstitution(institution)}
              >
                <div className="list-row-topline">
                  <strong>{institution.type.replaceAll("_", " ")}</strong>
                  <StatusPill status={institution.verification_status} />
                </div>
                <h3>{institution.name}</h3>
                <p>{institution.description}</p>
                <div className="list-row-meta">
                  <span>{institution.location}</span>
                  <span>Open review</span>
                </div>
              </button>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Listing moderation queue" subtitle="Review and manage every listing, including approved, under-review, fulfilled, and removed records.">
          <div className="list">
            {dashboard.listings_for_review.map((listing) => (
              <ListingListRow
                key={listing.id}
                listing={listing}
                description={listing.handling_requirements}
                meta={
                  <div className="list-row-meta">
                    <span>{listing.location}</span>
                    <span>{listing.quantity} unit(s)</span>
                    <span>Open review</span>
                  </div>
                }
                asButton
                onClick={() => setSelectedListing(listing)}
              />
            ))}
          </div>
        </DashboardPanel>
      </div>

      <div className="dashboard-grid" style={{ marginTop: "1rem" }}>
        <DashboardPanel title="Request competition" subtitle="Multiple institutions can request the same listing. Admin chooses the match.">
          <div className="list">
            {dashboard.requests_requiring_attention.map((request) => (
              <article key={request.id} className="list-row">
                <div className="list-row-topline">
                  <strong>{request.program_or_department}</strong>
                  <StatusPill status={request.status} />
                </div>
                <h3>{request.intended_use}</h3>
                <p>{request.urgency_notes}</p>
              </article>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Active threads and audit trail" subtitle="Admin visibility keeps conversations safe and operationally manageable.">
          <div className="list">
            {dashboard.active_threads.map((thread) => (
              <article key={thread.id} className="list-row">
                <div className="list-row-topline">
                  <strong>{thread.id}</strong>
                  <StatusPill status={thread.status} />
                </div>
                <p>Linked listing: {thread.listing_id}</p>
              </article>
            ))}
            {dashboard.recent_actions.map((action) => (
              <article key={action.id} className="list-row">
                <div className="list-row-topline">
                  <strong>{action.action_type.replaceAll("_", " ")}</strong>
                  <span>{action.created_at.slice(0, 10)}</span>
                </div>
                <p>{action.notes}</p>
              </article>
            ))}
          </div>
        </DashboardPanel>
      </div>

      {selectedInstitution ? (
        <InstitutionReviewModal institution={selectedInstitution} onClose={() => setSelectedInstitution(null)} />
      ) : null}

      {selectedListing ? <ListingReviewModal listing={selectedListing} onClose={() => setSelectedListing(null)} /> : null}
    </>
  );
}

function InstitutionReviewModal({
  institution,
  onClose,
}: {
  institution: Institution;
  onClose: () => void;
}) {
  return (
    <div className="review-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="review-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`institution-review-${institution.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="review-modal-header">
          <div>
            <span className="eyebrow">Institution review</span>
            <h2 id={`institution-review-${institution.id}`}>{institution.name}</h2>
          </div>
          <button type="button" className="button button-outline" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="review-modal-section">
          <div className="list-row-topline">
            <strong>{institution.type.replaceAll("_", " ")}</strong>
            <StatusPill status={institution.verification_status} />
          </div>
          <p>{institution.description}</p>
        </div>

        <div className="review-detail-grid">
          <div className="review-detail-card">
            <span>Location</span>
            <strong>{institution.location}</strong>
          </div>
          <div className="review-detail-card">
            <span>Institution ID</span>
            <strong>{institution.id}</strong>
          </div>
        </div>

        <form action={updateInstitutionStatusAction} className="review-modal-form">
          <input type="hidden" name="institutionId" value={institution.id} />
          <div className="auth-field">
            <label htmlFor={`institution-status-${institution.id}`}>Verification status</label>
            <select
              id={`institution-status-${institution.id}`}
              name="verificationStatus"
              defaultValue={institution.verification_status}
            >
              <option value="pending_verification">Pending verification</option>
              <option value="verified">Verify institution</option>
              <option value="rejected">Reject institution</option>
              <option value="suspended">Suspend institution</option>
            </select>
          </div>
          <button type="submit" className="button button-primary">
            Update status
          </button>
        </form>
      </section>
    </div>
  );
}

function ListingReviewModal({
  listing,
  onClose,
}: {
  listing: Listing;
  onClose: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(listing.status);
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
        throw new Error("You must be signed in as an admin to update listing status.");
      }

      const response = await fetch(`${API_BASE_URL}/admin/listings/${listing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
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
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not update the listing status.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="review-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="review-modal-card review-modal-card-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`listing-review-${listing.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="review-modal-header">
          <div>
            <span className="eyebrow">Listing review</span>
            <h2 id={`listing-review-${listing.id}`}>{listing.title}</h2>
          </div>
          <button type="button" className="button button-outline" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="review-modal-layout">
          <div className="review-modal-image">
            {listing.photo_urls[0] ? (
              <Image
                src={listing.photo_urls[0]}
                alt={listing.title}
                fill
                sizes="(max-width: 980px) 100vw, 40vw"
                className="listing-card-image"
              />
            ) : (
              <div className="review-modal-image-empty">No image uploaded</div>
            )}
          </div>

          <div className="review-modal-content">
            <div className="list-row-topline">
              <strong>{listing.category}</strong>
              <StatusPill status={listing.status} />
            </div>
            <p>{listing.description}</p>

            <div className="review-detail-grid">
              <div className="review-detail-card">
                <span>Condition</span>
                <strong>{listing.condition}</strong>
              </div>
              <div className="review-detail-card">
                <span>Quantity</span>
                <strong>{listing.quantity}</strong>
              </div>
              <div className="review-detail-card">
                <span>Location</span>
                <strong>{listing.location}</strong>
              </div>
              <div className="review-detail-card">
                <span>Posted</span>
                <strong>{formatDate(listing.created_at)}</strong>
              </div>
              <div className="review-detail-card">
                <span>Availability window</span>
                <strong>{listing.availability_window}</strong>
              </div>
              <div className="review-detail-card">
                <span>Request count</span>
                <strong>{listing.request_count}</strong>
              </div>
            </div>

            <div className="review-modal-section">
              <h3>Operational details</h3>
              <dl className="review-spec-grid">
                <div>
                  <dt>Handling requirements</dt>
                  <dd>{listing.handling_requirements}</dd>
                </div>
                <div>
                  <dt>Dimensions and weight</dt>
                  <dd>{listing.dimensions_weight}</dd>
                </div>
                <div>
                  <dt>Working status</dt>
                  <dd>{listing.working_status}</dd>
                </div>
                <div>
                  <dt>Documentation included</dt>
                  <dd>{listing.documentation_included}</dd>
                </div>
                <div>
                  <dt>Special handling flags</dt>
                  <dd>{listing.special_handling_flags}</dd>
                </div>
                <div>
                  <dt>Delivery mode</dt>
                  <dd>{listing.delivery_mode.replaceAll("_", " ")}</dd>
                </div>
              </dl>
            </div>

            <form onSubmit={handleSubmit} className="review-modal-form">
              <div className="auth-field">
                <label htmlFor={`listing-status-${listing.id}`}>Change Listing Status</label>
                <select
                  id={`listing-status-${listing.id}`}
                  name="status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as Listing["status"])}
                >
                  <option value="pending_admin_approval">Pending</option>
                  <option value="live">Approved</option>
                  <option value="removed_by_admin">Remove from marketplace</option>
                </select>
              </div>
              <button type="submit" className="button button-primary" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update status"}
              </button>
            </form>
            {error ? <p className="auth-notice auth-notice-error">{error}</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
