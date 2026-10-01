"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DashboardSidebarShell } from "@/components/dashboard-sidebar-shell";
import {
  OperationsMetricGrid,
  OperationsHeader,
  OperationsTableSection,
} from "@/components/operations-dashboard-ui";
import { RequestBoardForm } from "@/components/request-board-form";
import { StatusPill } from "@/components/status-pill";
import { closeBoardPost } from "@/lib/api-client";
import { titleCaseStatus } from "@/lib/format";
import type { ListingStatus, RecipientDashboardResponse } from "@/lib/types";

function isListingUnderReview(status?: ListingStatus | null) {
  return status === "pending_admin_approval";
}

function isListingPubliclyViewable(status?: ListingStatus | null) {
  return status === "live" || status === "matched_reserved";
}

function getRecipientRequestDisplayStatus(request: RecipientDashboardResponse["requests"][number]) {
  if (isListingUnderReview(request.listing?.status)) {
    return "listing_under_review";
  }

  return request.status === "submitted" ? "pending_request" : request.status;
}

function getSavedListingDisplayStatus(listing: RecipientDashboardResponse["saved_listings"][number]) {
  if (isListingUnderReview(listing.status)) {
    return "listing_under_review";
  }

  return listing.status;
}

export function RecipientDashboardWorkspace({
  dashboard,
  activeRequests,
  totalImpact,
}: {
  dashboard: RecipientDashboardResponse;
  activeRequests: number;
  totalImpact: number;
}) {
  const router = useRouter();
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [closingPostId, setClosingPostId] = useState<string | null>(null);

  async function handleClosePost(postId: string) {
    setClosingPostId(postId);
    await closeBoardPost(postId);
    setClosingPostId(null);
    router.refresh();
  }

  function handleFormSuccess() {
    setShowNewPostForm(false);
    router.refresh();
  }

  return (
    <DashboardSidebarShell
      brandSubtitle="Recipient workspace"
      header={
        <>
          <OperationsHeader title="Recipient Dashboard" />
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
          title: "Requested Items",
          shortLabel: "Requests",
          count: dashboard.requests.length,
          icon: "requests",
          tone: "primary",
          content: (
            <OperationsTableSection
              title="Request Reviews"
              tone="primary"
              hideTitle
              columns={["Request", "Status", ""]}
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
                  <td>
                    <StatusPill status={getRecipientRequestDisplayStatus(request)} />
                  </td>
                  <td className="ops-table-align-right">
                    {request.listing && isListingPubliclyViewable(request.listing.status) ? (
                      <Link href={`/listings/${request.listing_id}`} className="button button-secondary">
                        View listing
                      </Link>
                    ) : request.listing ? (
                      <button type="button" className="button button-secondary" disabled aria-disabled="true">
                        View listing
                      </button>
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
              columns={["Listing", "Status", "Condition", ""]}
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
                        <p className="ops-equipment-subtitle">{listing.location}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusPill status={getSavedListingDisplayStatus(listing)} />
                    </td>
                    <td>
                      <span className="ops-condition-badge">{titleCaseStatus(listing.condition)}</span>
                    </td>
                    <td className="ops-table-align-right">
                      {isListingPubliclyViewable(listing.status) ? (
                        <Link href={`/listings/${listing.id}`} className="button button-secondary">
                          View listing
                        </Link>
                      ) : (
                        <button type="button" className="button button-secondary" disabled aria-disabled="true">
                          View listing
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
              </OperationsTableSection>
            ),
          },
          {
            id: "recipient-request-board",
            title: "Request Board",
            shortLabel: "Board",
            count: dashboard.request_board_posts.length,
            icon: "board",
            tone: "tertiary",
            content: (
              <OperationsTableSection
                title="Request Board Posts"
                tone="tertiary"
                columns={["Request", "Category", "Needed By", "Status", ""]}
                action={
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => setShowNewPostForm((prev) => !prev)}
                  >
                    {showNewPostForm ? "Cancel" : "New Request"}
                  </button>
                }
                footer={<span>Showing {dashboard.request_board_posts.length} board post(s)</span>}
              >
                {showNewPostForm ? (
                  <tr>
                    <td colSpan={5} className="ops-table-empty-cell">
                      <div className="ops-inline-form">
                        <RequestBoardForm onSuccess={handleFormSuccess} />
                      </div>
                    </td>
                  </tr>
                ) : null}
                {dashboard.request_board_posts.length === 0 && !showNewPostForm ? (
                  <tr>
                    <td colSpan={5} className="ops-table-empty-cell">
                      <div className="ops-empty-state">No board posts yet. Use &ldquo;New Request&rdquo; to post a need.</div>
                    </td>
                  </tr>
                ) : (
                  dashboard.request_board_posts.map((post) => (
                    <tr key={post.id} className="ops-table-row">
                      <td>
                        <p className="ops-equipment-title">{post.title}</p>
                        <p className="ops-equipment-subtitle">{post.intended_use}</p>
                      </td>
                      <td>
                        <span className="ops-condition-badge">{post.category}</span>
                      </td>
                      <td>
                        <span className="ops-table-date">{post.needed_by}</span>
                      </td>
                      <td>
                        <StatusPill status={post.status} />
                      </td>
                      <td className="ops-table-align-right">
                        {post.status === "open" ? (
                          <button
                            type="button"
                            className="button button-secondary"
                            disabled={closingPostId === post.id}
                            onClick={() => handleClosePost(post.id)}
                          >
                            {closingPostId === post.id ? "Closing…" : "Close"}
                          </button>
                        ) : (
                          <span className="ops-table-fallback">{titleCaseStatus(post.status)}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </OperationsTableSection>
            ),
          },
        ]}
    />
  );
}
