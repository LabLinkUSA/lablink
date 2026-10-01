"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import styles from "@/components/recipient-dashboard.module.css";
import { Button, ButtonLink, Card, Chip, cx, DataTable, EmptyState, Highlight, tableStyles } from "@/components/ui";
import {
  OperationsMetricGrid,
  OperationsHeader,
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
    <DashboardShell
      brandSubtitle="Recipient workspace"
      header={
        <>
          <OperationsHeader
            eyebrow="Recipient workspace"
            title={
              <>
                Recipient <Highlight>Dashboard</Highlight>
              </>
            }
          />
          <OperationsMetricGrid
            items={[
              { label: "Active Requests", value: activeRequests },
              { label: "Saved Listings", value: dashboard.saved_listings.length },
              { label: "Total Impact", value: totalImpact },
            ]}
          />
        </>
      }
      sections={[
        {
          id: "recipient-requests",
          title: "Requested Items",
          count: dashboard.requests.length,
          icon: "requests",
          content: (
            <DataTable
              head={["Request", "Status", "Actions"]}
              footer={<span>Showing {dashboard.requests.length} recipient request(s)</span>}
              isEmpty={dashboard.requests.length === 0}
              empty={<EmptyState variant="empty" title="No requests yet." />}
            >
              {dashboard.requests.map((request) => (
                <tr key={request.id} className={tableStyles.row}>
                  <td>
                    <div className={tableStyles.titleCell}>
                      {request.listing?.photo_urls[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={request.listing.photo_urls[0]} alt={request.listing.title} width={52} height={52} loading="lazy" className={tableStyles.thumb} />
                      ) : (
                        <span className={cx(tableStyles.thumb, tableStyles.thumbEmpty)}>—</span>
                      )}
                      <div>
                        <span>{request.listing?.title ?? request.program_or_department}</span>
                        <span className={cx(tableStyles.subtitle, styles.truncate)}>{request.intended_use}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <StatusPill status={getRecipientRequestDisplayStatus(request)} />
                  </td>
                  <td className={tableStyles.cellRight}>
                    {request.listing && isListingPubliclyViewable(request.listing.status) ? (
                      <ButtonLink href={`/listings/${request.listing_id}`} variant="secondary" size="sm">
                        View listing
                      </ButtonLink>
                    ) : request.listing ? (
                      <Button variant="secondary" size="sm" disabled aria-disabled="true">
                        View listing
                      </Button>
                    ) : (
                      <span className={styles.muted}>{titleCaseStatus(request.status)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </DataTable>
          ),
        },
        {
          id: "recipient-saved-listings",
          title: "Saved Listings",
          count: dashboard.saved_listings.length,
          icon: "saved",
          content: (
            <DataTable
              head={["Listing", "Status", "Condition", "Actions"]}
              footer={<span>Showing {dashboard.saved_listings.length} saved listing(s)</span>}
              isEmpty={dashboard.saved_listings.length === 0}
              empty={<EmptyState variant="empty" title="No saved listings yet." />}
            >
              {dashboard.saved_listings.map((listing) => (
                <tr key={listing.id} className={tableStyles.row}>
                  <td>
                    <div className={tableStyles.titleCell}>
                      {listing.photo_urls[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={listing.photo_urls[0]} alt={listing.title} width={52} height={52} loading="lazy" className={tableStyles.thumb} />
                      ) : (
                        <span className={cx(tableStyles.thumb, tableStyles.thumbEmpty)}>—</span>
                      )}
                      <div>
                        <span>{listing.title}</span>
                        <span className={tableStyles.subtitle}>{listing.location}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <StatusPill status={getSavedListingDisplayStatus(listing)} />
                  </td>
                  <td>
                    <Chip>{titleCaseStatus(listing.condition)}</Chip>
                  </td>
                  <td className={tableStyles.cellRight}>
                    {isListingPubliclyViewable(listing.status) ? (
                      <ButtonLink href={`/listings/${listing.id}`} variant="secondary" size="sm">
                        View listing
                      </ButtonLink>
                    ) : (
                      <Button variant="secondary" size="sm" disabled aria-disabled="true">
                        View listing
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </DataTable>
          ),
        },
        {
          id: "recipient-request-board",
          title: "Request Board",
          count: dashboard.request_board_posts.length,
          icon: "board",
          action: (
            <Button onClick={() => setShowNewPostForm((prev) => !prev)}>
              {showNewPostForm ? "Cancel" : "New Request"}
            </Button>
          ),
          content: (
            <>
              {showNewPostForm ? (
                <Card className={styles.formCard}>
                  <h3 className={styles.formHead}>New request</h3>
                  <RequestBoardForm onSuccess={handleFormSuccess} />
                </Card>
              ) : null}
              <DataTable
                head={["Request", "Category", "Needed By", "Status", "Actions"]}
                footer={<span>Showing {dashboard.request_board_posts.length} board post(s)</span>}
                isEmpty={dashboard.request_board_posts.length === 0}
                empty={<EmptyState variant="empty" title="No board posts yet. Use “New Request” to post a need." />}
              >
                {dashboard.request_board_posts.map((post) => (
                  <tr key={post.id} className={tableStyles.row}>
                    <td>
                      <div>
                        <span>{post.title}</span>
                        <span className={cx(tableStyles.subtitle, styles.truncate)}>{post.intended_use}</span>
                      </div>
                    </td>
                    <td>
                      <Chip>{post.category}</Chip>
                    </td>
                    <td>{post.needed_by}</td>
                    <td>
                      <StatusPill status={post.status} />
                    </td>
                    <td className={tableStyles.cellRight}>
                      {post.status === "open" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={closingPostId === post.id}
                          onClick={() => handleClosePost(post.id)}
                        >
                          {closingPostId === post.id ? "Closing…" : "Close"}
                        </Button>
                      ) : (
                        <span className={styles.muted}>{titleCaseStatus(post.status)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </DataTable>
            </>
          ),
        },
      ]}
    />
  );
}
