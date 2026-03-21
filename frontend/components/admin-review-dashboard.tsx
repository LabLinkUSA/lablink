"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardPanel } from "@/components/dashboard-panel";
import { ListingListRow } from "@/components/listing-list-row";
import { StatusPill } from "@/components/status-pill";
import { formatDate } from "@/lib/format";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AdminDashboardResponse, Institution, Listing, ListingDetailResponse, RequestStatus } from "@/lib/types";

type AdminReviewDashboardProps = {
  dashboard: AdminDashboardResponse;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const supabase = createSupabaseBrowserClient();
const REQUEST_STATUS_OPTIONS: RequestStatus[] = [
  "admin_review",
  "awaiting_donor_confirmation",
  "approved_matched",
  "pickup_transfer_coordination",
  "completed",
  "rejected_cancelled",
];

export function AdminReviewDashboard({ dashboard }: AdminReviewDashboardProps) {
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedCompetitionListingId, setSelectedCompetitionListingId] = useState<string | null>(null);
  const groupedCompetitionRequests = Array.from(
    dashboard.requests_requiring_attention.reduce((groups, request) => {
      const existingGroup = groups.get(request.listing_id);
      if (existingGroup) {
        existingGroup.requests.push(request);
        return groups;
      }

      groups.set(request.listing_id, {
        listing: request.listing,
        requests: [request],
      });
      return groups;
    }, new Map<string, { listing: AdminDashboardResponse["requests_requiring_attention"][number]["listing"]; requests: AdminDashboardResponse["requests_requiring_attention"] }>()),
  );

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
            {groupedCompetitionRequests.map(([listingId, group]) => {
              const matchedRequest = group.requests.find((request) => request.status === "approved_matched");
              const primaryStatus = matchedRequest?.status ?? group.requests[0]?.status ?? "submitted";

              return group.listing ? (
                <ListingListRow
                  key={listingId}
                  listing={group.listing}
                  description={
                    matchedRequest
                      ? `Matched to ${matchedRequest.program_or_department}`
                      : `${group.requests.length} institution${group.requests.length === 1 ? "" : "s"} requesting this listing`
                  }
                  meta={
                    <div className="list-row-meta">
                      <span>{group.requests.length} request(s)</span>
                      {matchedRequest ? <span>Selected institution: {matchedRequest.program_or_department}</span> : null}
                    </div>
                  }
                  actions={<StatusPill status={primaryStatus} />}
                  asButton
                  onClick={() => setSelectedCompetitionListingId(listingId)}
                />
              ) : (
                <article key={listingId} className="list-row">
                  <div className="list-row-topline">
                    <strong>{group.requests.length} request(s)</strong>
                    <StatusPill status={primaryStatus} />
                  </div>
                  <h3>Request competition for listing {listingId}</h3>
                  <p>
                    {matchedRequest
                      ? `Matched to ${matchedRequest.program_or_department}.`
                      : "Open review to choose which recipient institution receives this listing."}
                  </p>
                </article>
              );
            })}
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
      {selectedCompetitionListingId ? (
        <RequestCompetitionModal
          listingId={selectedCompetitionListingId}
          onClose={() => setSelectedCompetitionListingId(null)}
        />
      ) : null}
    </>
  );
}

function RequestCompetitionModal({
  listingId,
  onClose,
}: {
  listingId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<ListingDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [requestStatuses, setRequestStatuses] = useState<Record<string, RequestStatus>>({});
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw new Error(sessionError.message);
        }

        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("You must be signed in as an admin to review request competition.");
        }

        const response = await fetch(`${API_BASE_URL}/admin/listings/${listingId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          let message = "Could not load the request competition view.";
          try {
            const body = (await response.json()) as { detail?: string };
            if (body.detail) {
              message = body.detail;
            }
          } catch {}
          throw new Error(message);
        }

        const nextDetail = (await response.json()) as ListingDetailResponse;
        setDetail(nextDetail);
        setRequestStatuses(
          Object.fromEntries(nextDetail.related_requests.map((request) => [request.id, request.status as RequestStatus])),
        );
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load the request competition view.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [listingId]);

  async function handleSelectRecipient(requestId: string) {
    setSelectedRequestId(requestId);
    setError(null);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in as an admin to select a recipient.");
      }

      const response = await fetch(`${API_BASE_URL}/admin/requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status: requestStatuses[requestId] ?? "approved_matched",
          admin_note: adminNote.trim() || undefined,
        }),
      });

      if (!response.ok) {
        let message = "Could not update the request status.";
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
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : "Could not update the request status.");
    } finally {
      setSelectedRequestId(null);
    }
  }

  async function handleCancelMatch() {
    setIsCancelling(true);
    setError(null);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in as an admin to cancel the match.");
      }

      const response = await fetch(`${API_BASE_URL}/admin/listings/${listingId}/cancel-match`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        let message = "Could not cancel the current match.";
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
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Could not cancel the current match.");
    } finally {
      setIsCancelling(false);
    }
  }

  const hasMatchedRequest = Boolean(detail?.related_requests.some((request) => request.status === "approved_matched"));

  return (
    <div className="review-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="review-modal-card review-modal-card-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`request-competition-${listingId}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="review-modal-header">
          <div>
            <span className="eyebrow">Request competition</span>
            <h2 id={`request-competition-${listingId}`}>{detail?.listing.title ?? "Loading listing..."}</h2>
          </div>
          <div className="page-actions" style={{ marginTop: 0 }}>
            {hasMatchedRequest ? (
              <button type="button" className="button button-outline" onClick={handleCancelMatch} disabled={isCancelling}>
                {isCancelling ? "Cancelling..." : "Cancel match"}
              </button>
            ) : null}
            <button type="button" className="button button-outline" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {isLoading ? <p className="auth-notice">Loading request competition...</p> : null}
        {error ? <p className="auth-notice auth-notice-error">{error}</p> : null}

        {detail ? (
          <div className="list">
            <div className="auth-field">
              <label htmlFor={`request-admin-note-${listingId}`}>Admin note</label>
              <textarea
                id={`request-admin-note-${listingId}`}
                name="adminNote"
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                rows={3}
                placeholder="Optional note included in recipient notifications"
              />
            </div>
            {detail.related_requests.map((request) => (
              <article key={request.id} className="list-row">
                <div className="list-row-topline">
                  <strong>{request.program_or_department}</strong>
                  <StatusPill status={request.status} />
                </div>
                <h3>{request.intended_use}</h3>
                <p>{request.storage_readiness}</p>
                <div className="list-row-meta">
                  <span>Needed by {request.needed_by}</span>
                  <span>{request.delivery_constraints}</span>
                </div>
                <div className="list-row-actions">
                  <label className="sr-only" htmlFor={`request-status-${request.id}`}>
                    Request status
                  </label>
                  <select
                    id={`request-status-${request.id}`}
                    value={requestStatuses[request.id] ?? request.status}
                    onChange={(event) =>
                      setRequestStatuses((current) => ({
                        ...current,
                        [request.id]: event.target.value as RequestStatus,
                      }))
                    }
                  >
                    {REQUEST_STATUS_OPTIONS.map((statusValue) => (
                      <option key={statusValue} value={statusValue}>
                        {statusValue.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => handleSelectRecipient(request.id)}
                    disabled={selectedRequestId === request.id}
                  >
                    {selectedRequestId === request.id ? "Updating..." : "Update status"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function InstitutionReviewModal({
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

        <form onSubmit={handleSubmit} className="review-modal-form">
          <div className="auth-field">
            <label htmlFor={`institution-status-${institution.id}`}>Verification status</label>
            <select
              id={`institution-status-${institution.id}`}
              name="verificationStatus"
              value={verificationStatus}
              onChange={(event) => setVerificationStatus(event.target.value as Institution["verification_status"])}
            >
              <option value="pending_verification">Pending verification</option>
              <option value="verified">Verify institution</option>
              <option value="rejected">Reject institution</option>
              <option value="suspended">Suspend institution</option>
            </select>
          </div>
          <div className="auth-field">
            <label htmlFor={`institution-note-${institution.id}`}>Admin note</label>
            <textarea
              id={`institution-note-${institution.id}`}
              name="adminNote"
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              rows={3}
              placeholder="Optional note included in the institution notification"
            />
          </div>
          <button type="submit" className="button button-primary" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update status"}
          </button>
        </form>
        {error ? <p className="auth-notice auth-notice-error">{error}</p> : null}
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
                  {listing.status !== "matched_reserved" ? <option value="pending_admin_approval">Pending</option> : null}
                  {listing.status !== "matched_reserved" ? <option value="live">Approved</option> : null}
                  {listing.status === "matched_reserved" ? <option value="matched_reserved">Match reserved</option> : null}
                  <option value="removed_by_admin">Remove from marketplace</option>
                </select>
              </div>
              <div className="auth-field">
                <label htmlFor={`listing-note-${listing.id}`}>Admin note</label>
                <textarea
                  id={`listing-note-${listing.id}`}
                  name="adminNote"
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  rows={3}
                  placeholder="Optional note included in the donor notification"
                />
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
