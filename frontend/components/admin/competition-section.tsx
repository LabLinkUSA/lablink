import { cx, DataTable, EmptyState, tableStyles } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import type { AdminDashboardResponse } from "@/lib/types";

import styles from "./admin.module.css";
import { FilterBar } from "./filter-bar";

type CompetitionRequest = AdminDashboardResponse["requests_requiring_attention"][number];

export type CompetitionGroup = [string, { listing: CompetitionRequest["listing"]; requests: CompetitionRequest[] }];

export function CompetitionSection({
  rows,
  search,
  onSearch,
  onOpen,
}: {
  rows: CompetitionGroup[];
  search: string;
  onSearch(value: string): void;
  onOpen(listingId: string): void;
}) {
  return (
    <>
      <FilterBar search={{ value: search, onChange: onSearch, placeholder: "Search by listing title or institution…" }} />
      <DataTable
        head={["Listing", "Recipients", "Primary Status", ""]}
        footer={<span>Showing {rows.length} recipient selection item(s)</span>}
        isEmpty={rows.length === 0}
        empty={<EmptyState variant="empty" title="No recipient selection items yet." />}
      >
        {rows.map(([listingId, group]) => {
          const matchedRequest = group.requests.find((request) => request.status === "approved_matched");
          const primaryStatus = matchedRequest?.status ?? group.requests[0]?.status ?? "submitted";
          const urgencyLabel = matchedRequest?.program_or_department ?? group.requests[0]?.program_or_department;
          const isCompetitionListingInactive = group.listing?.status === "pending_admin_approval";

          return (
            <tr
              key={listingId}
              className={cx(
                tableStyles.row,
                isCompetitionListingInactive ? tableStyles.rowMuted : cx(tableStyles.rowClickable, "ops-table-row-clickable"),
              )}
              tabIndex={isCompetitionListingInactive ? undefined : 0}
              onClick={isCompetitionListingInactive ? undefined : () => onOpen(listingId)}
              onKeyDown={
                isCompetitionListingInactive
                  ? undefined
                  : (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpen(listingId);
                      }
                    }
              }
            >
              <td>
                <div className={tableStyles.titleCell}>
                  {group.listing?.photo_urls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={group.listing.photo_urls[0]} alt={group.listing.title} width={52} height={52} loading="lazy" className={tableStyles.thumb} />
                  ) : (
                    <span className={cx(tableStyles.thumb, tableStyles.thumbEmpty)}>No image</span>
                  )}
                  <div>
                    <span className={styles.rowTitle}>{group.listing?.title ?? `Listing ${listingId}`}</span>
                    <span className={tableStyles.subtitle}>
                      {matchedRequest
                        ? `Matched institution: ${urgencyLabel}`
                        : "Choose which recipient institution receives this listing."}
                    </span>
                  </div>
                </div>
              </td>
              <td>
                <span className={styles.rowTitle}>{group.requests.length} request(s)</span>
                {matchedRequest ? <span className={tableStyles.subtitle}>Recipient selected</span> : null}
              </td>
              <td>
                <StatusPill status={primaryStatus} />
              </td>
              <td className={tableStyles.cellRight}>
                <span className={isCompetitionListingInactive ? styles.unavailable : styles.linkish}>
                  {isCompetitionListingInactive ? "Unavailable" : "Open review"}
                </span>
              </td>
            </tr>
          );
        })}
      </DataTable>
    </>
  );
}
