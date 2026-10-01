"use client";

import { useEffect, useState } from "react";

import styles from "@/components/donor-dashboard.module.css";
import { ButtonLink, Card, Chip, cx, DataTable, EmptyState, Highlight, Modal, Notice, tableStyles } from "@/components/ui";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DonorListingActions } from "@/components/donor-listing-actions";
import {
  OperationsMetricGrid,
  OperationsHeader,
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
      <DashboardShell
        brandSubtitle="Donor workspace"
        header={
          <>
            <OperationsHeader
              eyebrow="Donor workspace"
              title={
                <>
                  Donor <Highlight>Dashboard</Highlight>
                </>
              }
              actions={
                <ButtonLink href="/donor/list-equipment" className="donor-dashboard-cta" arrow>
                  + Donate Equipment
                </ButtonLink>
              }
            />
            <OperationsMetricGrid
              items={[
                { label: "Pending Approvals", value: pendingApprovalCount },
                { label: "Total Donations", value: dashboard.impact_summary.total_items_donated },
                { label: "Successful Deliveries", value: successfulDeliveries },
              ]}
            />
          </>
        }
        sections={[
          {
            id: "donor-listings",
            title: "Equipment Submissions",
            count: dashboard.listings.length,
            icon: "listings",
            content: (
              <DataTable
                head={["Equipment", "Status", "Condition", "Actions"]}
                footer={<span>Showing {dashboard.listings.length} donor listing(s)</span>}
              >
                {dashboard.listings.map((listing) => (
                  <tr key={listing.id} className={tableStyles.row}>
                    <td>
                      <div className={tableStyles.titleCell}>
                        {listing.photo_urls[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={listing.photo_urls[0]} alt={listing.title} width={52} height={52} loading="lazy" className={tableStyles.thumb} />
                        ) : (
                          <span className={cx(tableStyles.thumb, tableStyles.thumbEmpty)}>—</span>
                        )}
                        <span>{listing.title}</span>
                      </div>
                    </td>
                    <td>
                      <StatusPill status={listing.status} />
                    </td>
                    <td>
                      <Chip>{titleCaseStatus(listing.condition)}</Chip>
                    </td>
                    <td className={tableStyles.cellRight}>
                      <DonorListingActions listingId={listing.id} status={listing.status} />
                    </td>
                  </tr>
                ))}
              </DataTable>
            ),
          },
          {
            id: "donor-request-board",
            title: "Recipient Request Board",
            count: 0,
            icon: "board",
            content: (
              <Card tone="mint" data-request-board-panel className={styles.boardPanel}>
                <p className={styles.boardLine}>
                  Browse open equipment requests posted by recipient institutions and respond by creating a linked
                  listing.
                </p>
                <ButtonLink variant="ink" href="/donor/request-board" arrow>
                  Browse Request Board
                </ButtonLink>
              </Card>
            ),
          },
          {
            id: "donor-incoming-requests",
            title: "Incoming Requests",
            count: groupedIncomingRequests.length,
            icon: "competition",
            content: (
              <DataTable
                head={["Listing", "Requests", "Primary Status", "Notes"]}
                footer={<span>Showing {groupedIncomingRequests.length} request group(s)</span>}
                isEmpty={groupedIncomingRequests.length === 0}
                empty={<EmptyState variant="empty" title="No incoming requests yet." />}
              >
                {groupedIncomingRequests.map(([listingId, group]) => {
                  const primaryRequest = group.requests[0];
                  return (
                    <tr
                      key={listingId}
                      className={cx(tableStyles.row, tableStyles.rowClickable, "ops-table-row-clickable")}
                      tabIndex={0}
                      onClick={() => setSelectedIncomingListingId(listingId)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedIncomingListingId(listingId);
                        }
                      }}
                    >
                      <td>
                        <div className={tableStyles.titleCell}>
                          {group.listing?.photo_urls[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={group.listing.photo_urls[0]}
                              alt={group.listing.title}
                              className={tableStyles.thumb}
                            />
                          ) : (
                            <span className={cx(tableStyles.thumb, tableStyles.thumbEmpty)}>—</span>
                          )}
                          <span>{group.listing?.title ?? "Request competition"}</span>
                        </div>
                      </td>
                      <td>{group.requests.length}</td>
                      <td>
                        <StatusPill status={primaryRequest?.status ?? "submitted"} />
                      </td>
                      <td className={tableStyles.cellRight}>Open request details</td>
                    </tr>
                  );
                })}
              </DataTable>
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
    <Modal open onClose={onClose} wide eyebrow="Incoming requests" title={detail?.listing.title ?? "Loading listing…"}>
      {isLoading ? <Notice tone="info">Loading incoming requests…</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {detail ? (
        detail.related_requests.length === 0 ? (
          <EmptyState variant="empty" title="No incoming requests yet." />
        ) : (
          <div className={styles.requestList}>
            {detail.related_requests.map((request) => (
              <article key={request.id} className={styles.requestCard}>
                <div className={styles.requestTop}>
                  <span className={styles.requestProgram}>{request.program_or_department}</span>
                  <StatusPill status={request.status} />
                </div>
                <h3 className={styles.requestUse}>{request.intended_use}</h3>
                <p className={styles.requestText}>{request.storage_readiness}</p>
                <div className={styles.requestMeta}>
                  <span>{request.audience}</span>
                  <span>{request.delivery_constraints}</span>
                </div>
              </article>
            ))}
          </div>
        )
      ) : null}
    </Modal>
  );
}
