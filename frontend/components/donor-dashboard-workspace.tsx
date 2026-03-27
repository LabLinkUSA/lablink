"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DashboardSidebarShell } from "@/components/dashboard-sidebar-shell";
import { DonorListingActions } from "@/components/donor-listing-actions";
import {
  OperationsMetricGrid,
  OperationsHeader,
  OperationsTableSection,
} from "@/components/operations-dashboard-ui";
import { StatusPill } from "@/components/status-pill";
import { titleCaseStatus } from "@/lib/format";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { DonorDashboardResponse, ListingDetailResponse } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const supabase = createSupabaseBrowserClient();

export function DonorDashboardWorkspace({
  dashboard,
  pendingApprovalCount,
  successfulDeliveries,
}: {
  dashboard: DonorDashboardResponse;
  pendingApprovalCount: number;
  successfulDeliveries: number;
}) {
  const [selectedIncomingListingId, setSelectedIncomingListingId] = useState<string | null>(null);
  const groupedIncomingRequests = Array.from(
    dashboard.active_requests.reduce((groups, request) => {
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
    }, new Map<string, { listing: (typeof dashboard.active_requests)[number]["listing"]; requests: typeof dashboard.active_requests }>()),
  );

  return (
    <>
      <DashboardSidebarShell
        brandSubtitle="Donor workspace"
        header={
          <>
            <OperationsHeader
              title="Donor Dashboard"
              actions={
                <Link href="/donor/list-equipment" className="button button-primary donor-dashboard-cta">
                  + Donate Equipment
                </Link>
              }
            />
            <OperationsMetricGrid
              items={[
                { label: "Pending Approvals", value: pendingApprovalCount, tone: "tertiary", icon: "PA" },
                { label: "Total Donations", value: dashboard.impact_summary.total_items_donated, tone: "primary", icon: "TD" },
                { label: "Successful Deliveries", value: successfulDeliveries, tone: "secondary", icon: "SD" },
              ]}
            />
          </>
        }
        sections={[
          {
            id: "donor-listings",
            title: "Equipment Submissions",
            shortLabel: "Listings",
            count: dashboard.listings.length,
            icon: "listings",
            tone: "primary",
            content: (
              <OperationsTableSection
                title="Listing Reviews"
                tone="primary"
                hideTitle
                columns={["Equipment", "Status", "Condition", ""]}
                footer={<span>Showing {dashboard.listings.length} donor listing(s)</span>}
              >
                {dashboard.listings.map((listing) => (
                  <tr key={listing.id} className="ops-table-row">
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
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusPill status={listing.status} />
                    </td>
                    <td>
                      <span className="ops-condition-badge">{titleCaseStatus(listing.condition)}</span>
                    </td>
                    <td className="ops-table-align-right">
                      <div className="ops-table-actions">
                        <DonorListingActions listingId={listing.id} status={listing.status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </OperationsTableSection>
            ),
          },
          {
            id: "donor-incoming-requests",
            title: "Incoming Requests",
            shortLabel: "Requests",
            count: groupedIncomingRequests.length,
            icon: "competition",
            tone: "secondary",
            content: (
              <OperationsTableSection
                title="Incoming Request Reviews"
                tone="secondary"
                hideTitle
                columns={["Listing", "Requests", "Primary Status", "Notes"]}
                footer={<span>Showing {groupedIncomingRequests.length} request group(s)</span>}
              >
                {groupedIncomingRequests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="ops-table-empty-cell">
                      <div className="ops-empty-state">No incoming requests yet.</div>
                    </td>
                  </tr>
                ) : (
                  groupedIncomingRequests.map(([listingId, group]) => {
                    const primaryRequest = group.requests[0];
                    return (
                      <tr
                        key={listingId}
                        className="ops-table-row ops-table-row-clickable"
                        onClick={() => setSelectedIncomingListingId(listingId)}
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
                              <p className="ops-equipment-title">{group.listing?.title ?? "Request competition"}</p>
                            </div>
                          </div>
                        </td>
                        <td>{group.requests.length}</td>
                        <td>
                          <StatusPill status={primaryRequest?.status ?? "submitted"} />
                        </td>
                        <td className="ops-table-align-right">
                          <span className="ops-table-fallback">Open request details</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </OperationsTableSection>
            ),
          },
        ]}
      />
      {selectedIncomingListingId ? (
        <DonorIncomingRequestsModal
          listingId={selectedIncomingListingId}
          onClose={() => setSelectedIncomingListingId(null)}
        />
      ) : null}
    </>
  );
}

function DonorIncomingRequestsModal({
  listingId,
  onClose,
}: {
  listingId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ListingDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw new Error(sessionError.message);
        }

        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("You must be signed in as a donor to review incoming requests.");
        }

        const response = await fetch(`${API_BASE_URL}/donor/listings/${listingId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          let message = "Could not load incoming requests.";
          try {
            const body = (await response.json()) as { detail?: string };
            if (body.detail) {
              message = body.detail;
            }
          } catch {}
          throw new Error(message);
        }

        setDetail((await response.json()) as ListingDetailResponse);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load incoming requests.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [listingId]);

  return (
    <div className="review-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="review-modal-card review-modal-card-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`donor-incoming-${listingId}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="review-modal-header">
          <div>
            <span className="eyebrow">Incoming requests</span>
            <h2 id={`donor-incoming-${listingId}`}>{detail?.listing.title ?? "Loading listing..."}</h2>
          </div>
          <button type="button" className="button button-outline" onClick={onClose}>
            Close
          </button>
        </div>

        {isLoading ? <p className="auth-notice">Loading incoming requests...</p> : null}
        {error ? <p className="auth-notice auth-notice-error">{error}</p> : null}

        {detail ? (
          <div className="list">
            {detail.related_requests.length === 0 ? (
              <div className="ops-empty-state">No incoming requests yet.</div>
            ) : (
              detail.related_requests.map((request) => (
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
                </article>
              ))
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
