import { cx, DataTable, EmptyState, tableStyles } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import type { Institution } from "@/lib/types";

import styles from "./admin.module.css";
import { FilterBar } from "./filter-bar";

export function InstitutionSection({
  rows,
  total,
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  statuses,
  typeFilter,
  onTypeFilter,
  types,
  onOpen,
}: {
  rows: Institution[];
  total: number;
  search: string;
  onSearch(value: string): void;
  statusFilter: string;
  onStatusFilter(value: string): void;
  statuses: string[];
  typeFilter: string;
  onTypeFilter(value: string): void;
  types: string[];
  onOpen(institution: Institution): void;
}) {
  return (
    <>
      <FilterBar
        search={{ value: search, onChange: onSearch, placeholder: "Search by name or location..." }}
        selects={[
          ...(statuses.length > 1
            ? [
                {
                  name: "institutionStatusFilter",
                  label: "Filter by status",
                  value: statusFilter,
                  onChange: onStatusFilter,
                  options: [{ value: "", label: "All statuses" }, ...statuses.map((s) => ({ value: s, label: s.replaceAll("_", " ") }))],
                },
              ]
            : []),
          ...(types.length > 1
            ? [
                {
                  name: "institutionTypeFilter",
                  label: "Filter by type",
                  value: typeFilter,
                  onChange: onTypeFilter,
                  options: [{ value: "", label: "All types" }, ...types.map((t) => ({ value: t, label: t.replaceAll("_", " ") }))],
                },
              ]
            : []),
        ]}
      />
      <DataTable
        head={["Institution", "Location", "Status", ""]}
        footer={<span>Showing {rows.length} of {total} institution review item(s)</span>}
        isEmpty={rows.length === 0}
        empty={
          <EmptyState
            variant="empty"
            title={total === 0 ? "No institution reviews waiting right now." : "No institutions match the current filters."}
          />
        }
      >
        {rows.map((institution) => (
          <tr
            key={institution.id}
            className={cx(tableStyles.row, tableStyles.rowClickable, "ops-table-row-clickable")}
            tabIndex={0}
            onClick={() => onOpen(institution)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(institution);
              }
            }}
          >
            <td>
              <span className={styles.rowTitle}>{institution.name}</span>
              <span className={tableStyles.subtitle}>{institution.type.replaceAll("_", " ")}</span>
            </td>
            <td>{institution.location}</td>
            <td>
              <StatusPill status={institution.verification_status} />
            </td>
            <td className={tableStyles.cellRight}>
              <span className={styles.linkish}>Open review</span>
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
