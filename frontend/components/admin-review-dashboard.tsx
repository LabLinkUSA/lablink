"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  OperationsHeader,
  OperationsMetricGrid,
  OperationsTableSection,
} from "@/components/operations-dashboard-ui";
import { StatusPill } from "@/components/status-pill";
import { formatDate } from "@/lib/format";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AdminDashboardResponse, Institution, InternalListingDetailResponse, Listing, ListingDetailResponse } from "@/lib/types";

type AdminReviewDashboardProps = {
  dashboard: AdminDashboardResponse;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const supabase = createSupabaseBrowserClient();

function LabLinkAdminIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.2 5.5 6.2v5.4c0 4.2 2.7 7.9 6.5 9.2 3.8-1.3 6.5-5 6.5-9.2V6.2Zm0 2.1 4.7 2.1v4.2c0 3.1-1.9 5.8-4.7 6.9-2.8-1.1-4.7-3.8-4.7-6.9V7.4Zm-2 3.2h4.1v1.4H10Zm0 3.1h4.8V13H10Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CollapseRailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5.75 5.75h12.5A1.75 1.75 0 0 1 20 7.5v9a1.75 1.75 0 0 1-1.75 1.75H5.75A1.75 1.75 0 0 1 4 16.5v-9a1.75 1.75 0 0 1 1.75-1.75Zm0 1.5a.25.25 0 0 0-.25.25v9c0 .14.11.25.25.25H9.5v-9.5Zm5.25 9.5h7.25a.25.25 0 0 0 .25-.25v-9a.25.25 0 0 0-.25-.25H11Z"
        fill="currentColor"
      />
    </svg>
  );
}

function InstitutionQueueIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 19.25V7.4L12 4l7 3.4v11.85h-1.5V8.35L12 5.7 6.5 8.35v10.9Zm3.25-1.5h1.5v-2.5h-1.5Zm0-4h1.5v-2.5h-1.5Zm4 4h1.5v-2.5h-1.5Zm0-4h1.5v-2.5h-1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ListingQueueIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.5 4.75h11A1.75 1.75 0 0 1 19.25 6.5v11A1.75 1.75 0 0 1 17.5 19.25h-11A1.75 1.75 0 0 1 4.75 17.5v-11A1.75 1.75 0 0 1 6.5 4.75Zm0 1.5a.25.25 0 0 0-.25.25v11c0 .14.11.25.25.25h11a.25.25 0 0 0 .25-.25v-11a.25.25 0 0 0-.25-.25Zm2 2h7v1.5h-7Zm0 3.5h7v1.5h-7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CompetitionQueueIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 5.5a2.5 2.5 0 1 1-.01 5.01A2.5 2.5 0 0 1 7 5.5Zm10 8a2.5 2.5 0 1 1-.01 5.01A2.5 2.5 0 0 1 17 13.5Zm-8.45-4.2 6.9 5.4-.92 1.17-6.9-5.4Zm6.07-1.98.92 1.17-6.06 4.77-.93-1.18Z"
        fill="currentColor"
      />
    </svg>
  );
}

const ADMIN_SECTION_ORDER = [
  {
    id: "institution-verification",
    title: "Institution Verification",
    shortLabel: "Institutions",
    icon: InstitutionQueueIcon,
    tone: "primary",
  },
  {
    id: "listing-moderation",
    title: "Listing Verification",
    shortLabel: "Listings",
    icon: ListingQueueIcon,
    tone: "primary",
  },
  {
    id: "request-competition",
    title: "Recipient Selection",
    shortLabel: "Competition",
    icon: CompetitionQueueIcon,
    tone: "secondary",
  },
] as const;

type AdminSectionId = (typeof ADMIN_SECTION_ORDER)[number]["id"];

export function AdminReviewDashboard({ dashboard }: AdminReviewDashboardProps) {
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedCompetitionListingId, setSelectedCompetitionListingId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSectionId>("institution-verification");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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

  useEffect(() => {
    const storedValue = window.localStorage.getItem("lablink-admin-sidebar-collapsed");
    if (storedValue === "true") {
      setIsSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("lablink-admin-sidebar-collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const sections = ADMIN_SECTION_ORDER.map((section) => document.getElementById(section.id)).filter(
      (element): element is HTMLElement => Boolean(element),
    );

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

        if (visibleEntries[0]?.target.id) {
          setActiveSection(visibleEntries[0].target.id as AdminSectionId);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.15, 0.35, 0.55],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function scrollToSection(sectionId: AdminSectionId) {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const sectionCounts: Record<AdminSectionId, number> = {
    "institution-verification": dashboard.pending_institutions.length,
    "listing-moderation": dashboard.listings_for_review.length,
    "request-competition": groupedCompetitionRequests.length,
  };

  return (
    <>
      <div className={`admin-ops-shell ${isSidebarCollapsed ? "admin-ops-shell-collapsed" : ""}`}>
        <aside
          className={`admin-ops-nav ${isSidebarCollapsed ? "admin-ops-nav-collapsed" : ""}`}
          aria-label="Admin dashboard sections"
        >
          <div className="admin-ops-nav-panel">
            <div className="admin-ops-nav-chrome">
              {!isSidebarCollapsed ? (
                <div className="admin-ops-nav-brand">
                  <span className="admin-ops-nav-brand-mark" aria-hidden="true">
                    <LabLinkAdminIcon />
                  </span>
                  <div className="admin-ops-nav-brand-copy">
                    <strong>LabLink</strong>
                    <span>Admin workspace</span>
                  </div>
                </div>
              ) : <div />}
              <button
                type="button"
                className="admin-ops-nav-toggle"
                onClick={() => setIsSidebarCollapsed((current) => !current)}
                aria-label={isSidebarCollapsed ? "Expand admin sidebar" : "Collapse admin sidebar"}
                title={isSidebarCollapsed ? "Expand admin sidebar" : "Collapse admin sidebar"}
              >
                <CollapseRailIcon />
              </button>
            </div>

            <nav className="admin-ops-nav-list">
              {ADMIN_SECTION_ORDER.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`admin-ops-nav-button ${activeSection === section.id ? "admin-ops-nav-button-active" : ""}`}
                  onClick={() => scrollToSection(section.id)}
                  aria-label={section.title}
                  title={section.title}
                >
                  <span className="admin-ops-nav-button-icon" aria-hidden="true">
                    <section.icon />
                  </span>
                  {!isSidebarCollapsed ? (
                    <span className="admin-ops-nav-button-body">
                      <span className="admin-ops-nav-button-title">
                        <span>{section.title}</span>
                        <strong>{sectionCounts[section.id]}</strong>
                      </span>
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <div className="admin-ops-content">
          <div className="admin-ops-content-header">
            <OperationsHeader
              title="Admin Dashboard"
            />
            <OperationsMetricGrid
              items={[
                {
                  label: "Pending Approvals",
                  value: dashboard.pending_institutions.length + dashboard.listings_for_review.length,
                  tone: "tertiary",
                  icon: "PA",
                },
                {
                  label: "Total Donations",
                  value: dashboard.recent_actions.length,
                  tone: "primary",
                  icon: "TD",
                },
                {
                  label: "Successful Deliveries",
                  value: dashboard.active_threads.length,
                  tone: "secondary",
                  icon: "SD",
                },
              ]}
            />
          </div>

          <section id="institution-verification" className="admin-ops-section" data-admin-section>
            <div className="admin-ops-section-intro">
              <h2>
                <span className={`ops-section-accent ops-section-accent-${ADMIN_SECTION_ORDER[0].tone}`} />
                Institution Verification
              </h2>
            </div>
            <OperationsTableSection
              title="Institution Reviews"
              tone="primary"
              hideTitle
              columns={["Institution", "Location", "Status", ""]}
              footer={<span>Showing {dashboard.pending_institutions.length} institution review item(s)</span>}
            >
              {dashboard.pending_institutions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ops-table-empty-cell">
                    <div className="ops-empty-state">No institution reviews waiting right now.</div>
                  </td>
                </tr>
              ) : (
                dashboard.pending_institutions.map((institution) => (
                  <tr
                    key={institution.id}
                    className="ops-table-row ops-table-row-clickable"
                    onClick={() => setSelectedInstitution(institution)}
                  >
                    <td>
                      <div>
                        <p className="ops-equipment-title">{institution.name}</p>
                        <p className="ops-equipment-subtitle">{institution.type.replaceAll("_", " ")}</p>
                      </div>
                    </td>
                    <td>{institution.location}</td>
                    <td>
                      <StatusPill status={institution.verification_status} />
                    </td>
                    <td className="ops-table-align-right">
                      <span className="ops-table-linkish">Open review</span>
                    </td>
                  </tr>
                ))
              )}
            </OperationsTableSection>
          </section>

          <section id="listing-moderation" className="admin-ops-section" data-admin-section>
            <div className="admin-ops-section-intro">
              <h2>
                <span className={`ops-section-accent ops-section-accent-${ADMIN_SECTION_ORDER[1].tone}`} />
                Listing Verification
              </h2>
            </div>
            <OperationsTableSection
              title="Listing Reviews"
              tone="primary"
              hideTitle
              columns={["Equipment", "Institution", "Condition", "Status"]}
              footer={<span>Showing {dashboard.listings_for_review.length} listing review item(s)</span>}
            >
              {dashboard.listings_for_review.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ops-table-empty-cell">
                    <div className="ops-empty-state">No listings currently need moderation.</div>
                  </td>
                </tr>
              ) : (
                dashboard.listings_for_review.map((listing) => (
                  <tr
                    key={listing.id}
                    className="ops-table-row ops-table-row-clickable"
                    onClick={() => setSelectedListing(listing)}
                  >
                    <td>
                      <div className="ops-equipment-cell">
                        <div className="ops-equipment-media">
                          {listing.photo_urls[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={listing.photo_urls[0]} alt={listing.title} className="ops-equipment-image" />
                          ) : (
                            <div className="ops-equipment-empty">No image</div>
                          )}
                        </div>
                        <div>
                          <p className="ops-equipment-title">{listing.title}</p>
                          <p className="ops-equipment-subtitle">{listing.category}</p>
                        </div>
                      </div>
                    </td>
                    <td>{listing.location}</td>
                    <td>
                      <span className="ops-condition-badge">{listing.condition}</span>
                    </td>
                    <td className="ops-table-align-right">
                      <StatusPill status={listing.status} />
                    </td>
                  </tr>
                ))
              )}
            </OperationsTableSection>
          </section>

          <section id="request-competition" className="admin-ops-section" data-admin-section>
            <div className="admin-ops-section-intro">
              <h2>
                <span className={`ops-section-accent ops-section-accent-${ADMIN_SECTION_ORDER[2].tone}`} />
                Recipient Selection
              </h2>
            </div>
            <OperationsTableSection
              title="Recipient Selection"
              tone="secondary"
              hideTitle
              columns={["Listing", "Recipients", "Primary Status", ""]}
              footer={<span>Showing {groupedCompetitionRequests.length} recipient selection item(s)</span>}
            >
              {groupedCompetitionRequests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ops-table-empty-cell">
                    <div className="ops-empty-state">No recipient selection items yet.</div>
                  </td>
                </tr>
              ) : (
                groupedCompetitionRequests.map(([listingId, group]) => {
                  const matchedRequest = group.requests.find((request) => request.status === "approved_matched");
                  const primaryStatus = matchedRequest?.status ?? group.requests[0]?.status ?? "submitted";
                  const urgencyLabel = matchedRequest?.program_or_department ?? group.requests[0]?.program_or_department;
                  const isCompetitionListingInactive =
                    group.listing?.status === "pending_admin_approval" || group.listing?.status === "under_review";

                  return (
                    <tr
                      key={listingId}
                      className={`ops-table-row${isCompetitionListingInactive ? " ops-table-row-muted" : " ops-table-row-clickable"}`}
                      onClick={isCompetitionListingInactive ? undefined : () => setSelectedCompetitionListingId(listingId)}
                    >
                      <td>
                        <div className="ops-equipment-cell">
                          <div className="ops-equipment-media">
                            {group.listing?.photo_urls[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={group.listing.photo_urls[0]}
                                alt={group.listing.title}
                                className="ops-equipment-image"
                              />
                            ) : (
                              <div className="ops-equipment-empty">No image</div>
                            )}
                          </div>
                          <div>
                            <p className="ops-equipment-title">{group.listing?.title ?? `Listing ${listingId}`}</p>
                            <p className="ops-equipment-subtitle">
                              {matchedRequest
                                ? `Matched institution: ${urgencyLabel}`
                                : "Choose which recipient institution receives this listing."}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="admin-ops-competition-cell">
                          <strong>{group.requests.length} request(s)</strong>
                          {matchedRequest ? <span>Recipient selected</span> : null}
                        </div>
                      </td>
                      <td>
                        <StatusPill status={primaryStatus} />
                      </td>
                      <td className="ops-table-align-right">
                        <span className="ops-table-linkish">{isCompetitionListingInactive ? "Unavailable" : "Open review"}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </OperationsTableSection>
          </section>
        </div>
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

  useEffect(() => {
    void (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw new Error(sessionError.message);
        }

        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("You must be signed in as an admin to review recipient selection.");
        }

        const response = await fetch(`${API_BASE_URL}/admin/listings/${listingId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          let message = "Could not load the recipient selection view.";
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
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load the recipient selection view.");
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
          status: "approved_matched",
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
            <span className="eyebrow">Recipient selection</span>
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

        {isLoading ? <p className="auth-notice">Loading recipient selection...</p> : null}
        {error ? <p className="auth-notice auth-notice-error">{error}</p> : null}

        {detail ? (
          <div className="list">
            {detail.related_requests.map((request) => (
              <article key={request.id} className="list-row">
                <div className="list-row-topline">
                  <strong>{request.program_or_department}</strong>
                  <StatusPill status={request.status} />
                </div>
                <h3>{request.intended_use}</h3>
                <p>{request.storage_readiness}</p>
                <div className="list-row-meta">
                  <span>{request.audience}</span>
                  <span>{request.delivery_constraints}</span>
                </div>
                <div className="list-row-actions">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => handleSelectRecipient(request.id)}
                    disabled={selectedRequestId === request.id}
                  >
                    {selectedRequestId === request.id ? "Selecting..." : "Select recipient"}
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
    <div className="review-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="review-modal-card review-modal-card-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`listing-review-${reviewListing.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="review-modal-header">
          <div>
            <span className="eyebrow">Listing review</span>
            <h2 id={`listing-review-${reviewListing.id}`}>{reviewListing.title}</h2>
          </div>
          <button type="button" className="button button-outline" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="review-modal-layout">
          <div className="review-modal-image">
            {reviewListing.photo_urls[0] ? (
              <Image
                src={reviewListing.photo_urls[0]}
                alt={reviewListing.title}
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
              <strong>{reviewListing.category}</strong>
              <StatusPill status={reviewListing.status} />
            </div>
            <p>{reviewListing.description}</p>

            <div className="review-detail-grid">
              <div className="review-detail-card">
                <span>Condition</span>
                <strong>{reviewListing.condition}</strong>
              </div>
              <div className="review-detail-card">
                <span>Quantity</span>
                <strong>{reviewListing.quantity}</strong>
              </div>
              <div className="review-detail-card">
                <span>Location</span>
                <strong>{reviewListing.location}</strong>
              </div>
              <div className="review-detail-card">
                <span>Posted</span>
                <strong>{formatDate(reviewListing.created_at)}</strong>
              </div>
              <div className="review-detail-card">
                <span>Availability window</span>
                <strong>{reviewListing.availability_window}</strong>
              </div>
              <div className="review-detail-card">
                <span>Request count</span>
                <strong>{reviewListing.request_count}</strong>
              </div>
            </div>

            <div className="review-modal-section">
              <h3>Operational details</h3>
              <dl className="review-spec-grid">
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
            </div>

            <div className="review-modal-section">
              <h3>Compliance Forms</h3>
              {isDetailLoading ? <p>Loading compliance documents...</p> : null}
              {!isDetailLoading && documents.length === 0 ? (
                <p>No compliance PDFs are attached to this listing.</p>
              ) : null}
              {!isDetailLoading && documents.length > 0 ? (
                <div className="admin-document-grid">
                  {documents.map((document) => (
                    <article key={document.form_type} className="admin-document-card">
                      <div className="admin-document-card-header">
                        <div>
                          <strong>{document.title}</strong>
                          <p>
                            {document.completed_by_name
                              ? `Completed by ${document.completed_by_name}`
                              : "Not yet completed"}
                            {document.completed_at
                              ? ` on ${new Date(document.completed_at).toLocaleDateString()}`
                              : ""}
                          </p>
                        </div>
                        <span className={`admin-document-badge admin-document-badge-${document.status}`}>
                          {document.status.replaceAll("_", " ")}
                        </span>
                      </div>

                      {document.preview_url ? (
                        <iframe
                          title={`${document.title} preview`}
                          src={document.preview_url}
                          className="admin-document-preview"
                        />
                      ) : (
                        <div className="admin-document-preview admin-document-preview-empty">No PDF preview available</div>
                      )}

                      <div className="admin-document-actions">
                        {document.download_url ? (
                          <a
                            className="button button-secondary"
                            href={document.download_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Download PDF
                          </a>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} className="review-modal-form">
              <div className="auth-field">
                <label htmlFor={`listing-status-${reviewListing.id}`}>Change Listing Status</label>
                <select
                  id={`listing-status-${reviewListing.id}`}
                  name="status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as Listing["status"])}
                >
                  {reviewListing.status !== "matched_reserved" && reviewListing.status !== "rejected" ? (
                    <option value="pending_admin_approval">Pending</option>
                  ) : null}
                  {["pending_admin_approval", "under_review"].includes(reviewListing.status) ? (
                    <option value="rejected">Rejected</option>
                  ) : null}
                  {reviewListing.status !== "matched_reserved" && reviewListing.status !== "rejected" ? (
                    <option value="live">Approved</option>
                  ) : null}
                  {reviewListing.status === "rejected" ? <option value="rejected">Rejected</option> : null}
                  {reviewListing.status === "matched_reserved" ? <option value="matched_reserved">Match reserved</option> : null}
                  <option value="removed_by_admin">Remove from marketplace</option>
                </select>
              </div>
              <div className="auth-field">
                <label htmlFor={`listing-note-${reviewListing.id}`}>Admin note</label>
                <textarea
                  id={`listing-note-${reviewListing.id}`}
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

        {isRemovalConfirmOpen ? (
          <div className="review-modal-confirm">
            <div>
              <span className="eyebrow eyebrow-subtle">Confirm removal</span>
              <h3>Are you sure you want to remove this listing from the marketplace?</h3>
              <p>
                This will hide the listing from normal marketplace views and mark it as removed by admin. The listing
                record will still remain in the system.
              </p>
            </div>
            <div className="page-actions" style={{ marginTop: 0 }}>
              <button
                type="button"
                className="button button-outline"
                onClick={() => setIsRemovalConfirmOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-primary"
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
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
