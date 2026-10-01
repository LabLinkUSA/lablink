import { Chip, cx, DataTable, EmptyState, tableStyles } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { titleCaseStatus } from "@/lib/format";
import type { Listing } from "@/lib/types";

import styles from "./admin.module.css";
import { FilterBar } from "./filter-bar";

export function ListingSection({
  rows,
  total,
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  statuses,
  categoryFilter,
  onCategoryFilter,
  categories,
  onOpen,
}: {
  rows: Listing[];
  total: number;
  search: string;
  onSearch(value: string): void;
  statusFilter: string;
  onStatusFilter(value: string): void;
  statuses: string[];
  categoryFilter: string;
  onCategoryFilter(value: string): void;
  categories: string[];
  onOpen(listing: Listing): void;
}) {
  return (
    <>
      <FilterBar
        search={{ value: search, onChange: onSearch, placeholder: "Search by title, category, or location…" }}
        selects={[
          ...(statuses.length > 1
            ? [
                {
                  name: "listingStatusFilter",
                  label: "Filter by status",
                  value: statusFilter,
                  onChange: onStatusFilter,
                  options: [{ value: "", label: "All statuses" }, ...statuses.map((s) => ({ value: s, label: s.replaceAll("_", " ") }))],
                },
              ]
            : []),
          ...(categories.length > 1
            ? [
                {
                  name: "listingCategoryFilter",
                  label: "Filter by category",
                  value: categoryFilter,
                  onChange: onCategoryFilter,
                  options: [{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))],
                },
              ]
            : []),
        ]}
      />
      <DataTable
        head={["Equipment", "Institution", "Condition", "Status"]}
        footer={<span>Showing {rows.length} of {total} listing review item(s)</span>}
        isEmpty={rows.length === 0}
        empty={
          <EmptyState
            variant="empty"
            title={total === 0 ? "No listings currently need moderation." : "No listings match the current filters."}
          />
        }
      >
        {rows.map((listing) => (
          <tr
            key={listing.id}
            className={cx(tableStyles.row, tableStyles.rowClickable, "ops-table-row-clickable")}
            tabIndex={0}
            onClick={() => onOpen(listing)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(listing);
              }
            }}
          >
            <td>
              <div className={tableStyles.titleCell}>
                {listing.photo_urls[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={listing.photo_urls[0]} alt={listing.title} width={52} height={52} loading="lazy" className={tableStyles.thumb} />
                ) : (
                  <span className={cx(tableStyles.thumb, tableStyles.thumbEmpty)}>No image</span>
                )}
                <div>
                  <span className={styles.rowTitle}>{listing.title}</span>
                  <span className={tableStyles.subtitle}>{listing.category}</span>
                </div>
              </div>
            </td>
            <td>{listing.location}</td>
            <td>
              <Chip>{titleCaseStatus(listing.condition)}</Chip>
            </td>
            <td className={tableStyles.cellRight}>
              <StatusPill status={listing.status} />
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
