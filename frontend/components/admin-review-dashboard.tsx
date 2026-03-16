"use client";

import Image from "next/image";
import { useState } from "react";

import { DashboardPanel } from "@/components/dashboard-panel";
import { StatusPill } from "@/components/status-pill";
import { updateInstitutionStatusAction, updateListingStatusAction } from "@/app/admin/actions";
import { formatDate } from "@/lib/format";
import type { AdminDashboardResponse, Institution, Listing } from "@/lib/types";

type AdminReviewDashboardProps = {
  dashboard: AdminDashboardResponse;
};

export function AdminReviewDashboard({ dashboard }: AdminReviewDashboardProps) {
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  return (
    <>
      <div className="dashboard-grid">
        <DashboardPanel title="Institution verification queue" subtitle="Pending or suspended institutions require review.">
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

        <DashboardPanel title="Listing moderation queue" subtitle="Listings can enter moderation on submit or after material edits.">
          <div className="list">
            {dashboard.listings_for_review.map((listing) => (
              <button
                key={listing.id}
                type="button"
                className="list-row review-trigger"
                onClick={() => setSelectedListing(listing)}
              >
                <div className="list-row-topline">
                  <strong>{listing.category}</strong>
                  <StatusPill status={listing.status} />
                </div>
                <h3>{listing.title}</h3>
                <p>{listing.handling_requirements}</p>
                <div className="list-row-meta">
                  <span>{listing.location}</span>
                  <span>{listing.quantity} unit(s)</span>
                  <span>Open review</span>
                </div>
              </button>
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

            <form action={updateListingStatusAction} className="review-modal-form">
              <input type="hidden" name="listingId" value={listing.id} />
              <div className="auth-field">
                <label htmlFor={`listing-status-${listing.id}`}>Listing status</label>
                <select id={`listing-status-${listing.id}`} name="status" defaultValue={listing.status}>
                  <option value="pending_admin_approval">Pending approval</option>
                  <option value="live">Approve and publish</option>
                  <option value="under_review">Needs follow-up</option>
                  <option value="removed_expired">Remove from marketplace</option>
                </select>
              </div>
              <button type="submit" className="button button-primary">
                Update status
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
