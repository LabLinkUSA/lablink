"use client";

import Link from "next/link";

import { DashboardSidebarShell } from "@/components/dashboard-sidebar-shell";
import { DonorListingActions } from "@/components/donor-listing-actions";
import {
  OperationsMetricGrid,
  OperationsHeader,
  OperationsTableSection,
} from "@/components/operations-dashboard-ui";
import { StatusPill } from "@/components/status-pill";
import { titleCaseStatus } from "@/lib/format";
import type { DonorDashboardResponse } from "@/lib/types";

export function DonorDashboardWorkspace({
  dashboard,
  pendingApprovalCount,
  successfulDeliveries,
}: {
  dashboard: DonorDashboardResponse;
  pendingApprovalCount: number;
  successfulDeliveries: number;
}) {
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
          title: "Recent Equipment Submissions",
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
                        <p className="ops-equipment-subtitle">{listing.category}</p>
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
                    <tr key={listingId} className="ops-table-row">
                      <td>
                        <div>
                          <p className="ops-equipment-title">{group.listing?.title ?? "Request competition"}</p>
                          <p className="ops-equipment-subtitle">{group.requests.length} institution request(s)</p>
                        </div>
                      </td>
                      <td>{group.requests.length}</td>
                      <td>
                        <StatusPill status={primaryRequest?.status ?? "submitted"} />
                      </td>
                      <td className="ops-table-align-right">
                        <span className="ops-table-fallback">
                          {primaryRequest?.needed_by ? `Needed by ${primaryRequest.needed_by}` : "Awaiting timeline"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </OperationsTableSection>
          ),
        },
        {
          id: "donor-request-board",
          title: "Request Board Opportunities",
          shortLabel: "Board",
          count: 0,
          icon: "board",
          tone: "tertiary",
          content: (
            <OperationsTableSection
              title="Request Board Opportunities"
              tone="tertiary"
              hideTitle
              columns={["Opportunities", "Status", "Updated", "Notes"]}
              footer={<span>Showing 0 request board item(s)</span>}
            >
              <tr>
                <td colSpan={4} className="ops-table-empty-cell">
                  <div className="ops-empty-state">No requests yet.</div>
                </td>
              </tr>
            </OperationsTableSection>
          ),
        },
      ]}
    />
  );
}
