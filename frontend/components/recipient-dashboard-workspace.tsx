"use client";

import Link from "next/link";

import { DashboardSidebarShell } from "@/components/dashboard-sidebar-shell";
import {
  OperationsMetricGrid,
  OperationsHeader,
  OperationsTableSection,
} from "@/components/operations-dashboard-ui";
import { StatusPill } from "@/components/status-pill";
import { titleCaseStatus } from "@/lib/format";
import type { RecipientDashboardResponse } from "@/lib/types";

export function RecipientDashboardWorkspace({
  dashboard,
  activeRequests,
  totalImpact,
}: {
  dashboard: RecipientDashboardResponse;
  activeRequests: number;
  totalImpact: number;
}) {
  return (
    <DashboardSidebarShell
      brandSubtitle="Recipient workspace"
      header={
        <>
          <OperationsHeader
            title="Recipient Dashboard"
            actions={
              <button type="button" className="button button-primary" disabled>
                Create new request
              </button>
            }
          />
          <OperationsMetricGrid
            items={[
              { label: "Active Requests", value: activeRequests, tone: "tertiary", icon: "AR" },
              { label: "Saved Listings", value: dashboard.saved_listings.length, tone: "primary", icon: "SL" },
              { label: "Total Impact", value: totalImpact, tone: "secondary", icon: "TI" },
            ]}
          />
        </>
      }
      sections={[
        {
          id: "recipient-requests",
          title: "Recent Equipment Submissions",
          shortLabel: "Requests",
          count: dashboard.requests.length,
          icon: "requests",
          tone: "primary",
          content: (
            <OperationsTableSection
              title="Request Reviews"
              tone="primary"
              hideTitle
              columns={["Request", "Needed By", "Status", ""]}
              footer={<span>Showing {dashboard.requests.length} recipient request(s)</span>}
            >
              {dashboard.requests.map((request) => (
                <tr key={request.id} className="ops-table-row">
                  <td>
                    <div className="ops-equipment-cell">
                      <div className="ops-equipment-media">
                        {request.listing?.photo_urls[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={request.listing.photo_urls[0]} alt={request.listing.title} className="ops-equipment-image" />
                        ) : (
                          <div className="ops-equipment-empty">No image</div>
                        )}
                      </div>
                      <div>
                        <p className="ops-equipment-title">{request.listing?.title ?? request.program_or_department}</p>
                        <p className="ops-equipment-subtitle">{request.intended_use}</p>
                      </div>
                    </div>
                  </td>
                  <td>{request.needed_by}</td>
                  <td>
                    <StatusPill status={request.status === "submitted" ? "pending_request" : request.status} />
                  </td>
                  <td className="ops-table-align-right">
                    {request.listing ? (
                      <Link href={`/listings/${request.listing_id}`} className="button button-secondary">
                        View listing
                      </Link>
                    ) : (
                      <span className="ops-table-fallback">{titleCaseStatus(request.status)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </OperationsTableSection>
          ),
        },
        {
          id: "recipient-saved-listings",
          title: "Saved Listings",
          shortLabel: "Saved",
          count: dashboard.saved_listings.length,
          icon: "saved",
          tone: "secondary",
          content: (
            <OperationsTableSection
              title="Saved Listing Reviews"
              tone="secondary"
              hideTitle
              columns={["Listing", "Availability", "Condition", ""]}
              footer={<span>Showing {dashboard.saved_listings.length} saved listing(s)</span>}
            >
              {dashboard.saved_listings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ops-table-empty-cell">
                    <div className="ops-empty-state">No saved listings yet.</div>
                  </td>
                </tr>
              ) : (
                dashboard.saved_listings.map((listing) => (
                  <tr key={listing.id} className="ops-table-row">
                    <td>
                      <div>
                        <p className="ops-equipment-title">{listing.title}</p>
                        <p className="ops-equipment-subtitle">{listing.location}</p>
                      </div>
                    </td>
                    <td>{listing.availability_window}</td>
                    <td>
                      <span className="ops-condition-badge">{titleCaseStatus(listing.condition)}</span>
                    </td>
                    <td className="ops-table-align-right">
                      <Link href={`/listings/${listing.id}`} className="button button-secondary">
                        View listing
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </OperationsTableSection>
          ),
        },
        {
          id: "recipient-request-board",
          title: "Equipment Request Board",
          shortLabel: "Board",
          count: 0,
          icon: "board",
          tone: "tertiary",
          content: (
            <OperationsTableSection
              title="Equipment Request Board"
              tone="tertiary"
              hideTitle
              columns={["Requests", "Status", "Updated", "Notes"]}
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
