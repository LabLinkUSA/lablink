import { Button, DataTable, EmptyState, Notice, tableStyles } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import type { AdminDashboardResponse } from "@/lib/types";

import styles from "./admin.module.css";
import { FilterBar } from "./filter-bar";

export function BoardSection({
  rows,
  total,
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  categoryFilter,
  onCategoryFilter,
  categories,
  closingPostId,
  error,
  onClosePost,
}: {
  rows: AdminDashboardResponse["board_posts"];
  total: number;
  search: string;
  onSearch(value: string): void;
  statusFilter: string;
  onStatusFilter(value: string): void;
  categoryFilter: string;
  onCategoryFilter(value: string): void;
  categories: string[];
  closingPostId: string | null;
  error: string | null;
  onClosePost(postId: string): void;
}) {
  return (
    <>
      <FilterBar
        search={{ value: search, onChange: onSearch, placeholder: "Search by title or description..." }}
        selects={[
          {
            name: "boardStatusFilter",
            label: "Filter by status",
            value: statusFilter,
            onChange: onStatusFilter,
            options: [
              { value: "", label: "All statuses" },
              { value: "open", label: "open" },
              { value: "match_in_progress", label: "match in progress" },
              { value: "closed", label: "closed" },
            ],
          },
          ...(categories.length > 1
            ? [
                {
                  name: "boardCategoryFilter",
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
        head={["Post", "Institution", "Equipment Type", "Status", ""]}
        footer={<span>Showing {rows.length} of {total} board post(s)</span>}
        isEmpty={rows.length === 0}
        empty={<EmptyState variant="empty" title={total === 0 ? "No board posts yet." : "No board posts match the current filters."} />}
      >
        {rows.map((post) => (
          <tr key={post.id} className={tableStyles.row}>
            <td>
              <span className={styles.rowTitle}>{post.title}</span>
              <span className={tableStyles.subtitle}>{post.description}</span>
            </td>
            <td>{post.institution_id}</td>
            <td>{post.category}</td>
            <td>
              <StatusPill status={post.status} />
            </td>
            <td className={tableStyles.cellRight}>
              {post.status !== "closed" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onClosePost(post.id)}
                  disabled={closingPostId === post.id}
                >
                  {closingPostId === post.id ? "Closing..." : "Close post"}
                </Button>
              ) : (
                <span className={styles.unavailable}>Closed</span>
              )}
            </td>
          </tr>
        ))}
      </DataTable>
      {error ? <Notice tone="error" className={styles.sectionNotice}>{error}</Notice> : null}
    </>
  );
}
