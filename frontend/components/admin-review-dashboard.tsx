"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  OperationsHeader,
  OperationsMetricGrid,
  OperationsTableSection,
} from "@/components/operations-dashboard-ui";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Highlight } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { formatDate } from "@/lib/format";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AdminDashboardResponse, DuplicateInstitutionGroup, Institution, InternalListingDetailResponse, Listing, ListingDetailResponse } from "@/lib/types";

type AdminReviewDashboardProps = {
  dashboard: AdminDashboardResponse;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const supabase = createSupabaseBrowserClient();

const ADMIN_SECTION_ORDER = [
  { id: "institution-verification", title: "Institution Verification", icon: "shield" },
  { id: "listing-moderation", title: "Listing Verification", icon: "listings" },
  { id: "request-competition", title: "Recipient Selection", icon: "competition" },
  { id: "request-board", title: "Request Board", icon: "board" },
  { id: "duplicate-institutions", title: "Duplicate Institutions", icon: "duplicates" },
] as const;

type AdminSectionId = (typeof ADMIN_SECTION_ORDER)[number]["id"];

export function AdminReviewDashboard({ dashboard }: AdminReviewDashboardProps) {
  const router = useRouter();
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedCompetitionListingId, setSelectedCompetitionListingId] = useState<string | null>(null);
  const [closingPostId, setClosingPostId] = useState<string | null>(null);
  const [boardPostError, setBoardPostError] = useState<string | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateInstitutionGroup[]>([]);
  const [isDuplicatesLoading, setIsDuplicatesLoading] = useState(true);
  const [mergeConfirm, setMergeConfirm] = useState<{ group: DuplicateInstitutionGroup; primaryId: string; duplicateId: string } | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const [institutionSearch, setInstitutionSearch] = useState("");
  const [institutionStatusFilter, setInstitutionStatusFilter] = useState("");
  const [institutionTypeFilter, setInstitutionTypeFilter] = useState("");

  const [listingSearch, setListingSearch] = useState("");
  const [listingStatusFilter, setListingStatusFilter] = useState("");
  const [listingCategoryFilter, setListingCategoryFilter] = useState("");

  const [requestSearch, setRequestSearch] = useState("");

  const [boardSearch, setBoardSearch] = useState("");
  const [boardStatusFilter, setBoardStatusFilter] = useState("");
  const [boardCategoryFilter, setBoardCategoryFilter] = useState("");

  const filteredInstitutions = useMemo(() => {
    let items = dashboard.pending_institutions;
    if (institutionSearch) {
      const q = institutionSearch.toLowerCase();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(q) || i.location.toLowerCase().includes(q),
      );
    }
    if (institutionStatusFilter) {
      items = items.filter((i) => i.verification_status === institutionStatusFilter);
    }
    if (institutionTypeFilter) {
      items = items.filter((i) => i.type === institutionTypeFilter);
    }
    return items;
  }, [dashboard.pending_institutions, institutionSearch, institutionStatusFilter, institutionTypeFilter]);

  const filteredListings = useMemo(() => {
    let items = dashboard.listings_for_review;
    if (listingSearch) {
      const q = listingSearch.toLowerCase();
      items = items.filter(
        (i) => i.title.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.location.toLowerCase().includes(q),
      );
    }
    if (listingStatusFilter) {
      items = items.filter((i) => i.status === listingStatusFilter);
    }
    if (listingCategoryFilter) {
      const q = listingCategoryFilter.toLowerCase();
      items = items.filter((i) => i.category.toLowerCase() === q);
    }
    return items;
  }, [dashboard.listings_for_review, listingSearch, listingStatusFilter, listingCategoryFilter]);

  const listingCategories = useMemo(
    () => [...new Set(dashboard.listings_for_review.map((l) => l.category))].sort(),
    [dashboard.listings_for_review],
  );

  const listingStatuses = useMemo(
    () => [...new Set(dashboard.listings_for_review.map((l) => l.status))].sort(),
    [dashboard.listings_for_review],
  );

  const institutionTypes = useMemo(
    () => [...new Set(dashboard.pending_institutions.map((i) => i.type))].sort(),
    [dashboard.pending_institutions],
  );

  const institutionStatuses = useMemo(
    () => [...new Set(dashboard.pending_institutions.map((i) => i.verification_status))].sort(),
    [dashboard.pending_institutions],
  );

  const boardCategories = useMemo(
    () => [...new Set(dashboard.board_posts.map((p) => p.category))].sort(),
    [dashboard.board_posts],
  );

  const groupedCompetitionRequests = useMemo(() => {
    const groups = Array.from(
      dashboard.requests_requiring_attention.reduce((map, request) => {
        const existingGroup = map.get(request.listing_id);
        if (existingGroup) {
          existingGroup.requests.push(request);
          return map;
        }

        map.set(request.listing_id, {
          listing: request.listing,
          requests: [request],
        });
        return map;
      }, new Map<string, { listing: AdminDashboardResponse["requests_requiring_attention"][number]["listing"]; requests: AdminDashboardResponse["requests_requiring_attention"] }>()),
    );
    if (!requestSearch) return groups;
    const q = requestSearch.toLowerCase();
    return groups.filter(
      ([, group]) =>
        (group.listing?.title ?? "").toLowerCase().includes(q) ||
        group.requests.some((r) => r.program_or_department.toLowerCase().includes(q)),
    );
  }, [dashboard.requests_requiring_attention, requestSearch]);

  const filteredBoardPosts = useMemo(() => {
    let items = dashboard.board_posts;
    if (boardSearch) {
      const q = boardSearch.toLowerCase();
      items = items.filter(
        (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
      );
    }
    if (boardStatusFilter) {
      items = items.filter((p) => p.status === boardStatusFilter);
    }
    if (boardCategoryFilter) {
      const q = boardCategoryFilter.toLowerCase();
      items = items.filter((p) => p.category.toLowerCase() === q);
    }
    return items;
  }, [dashboard.board_posts, boardSearch, boardStatusFilter, boardCategoryFilter]);

  useEffect(() => {
    void (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session?.access_token) return;

        const response = await fetch(`${API_BASE_URL}/admin/institutions/duplicates`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        if (response.ok) {
          setDuplicateGroups((await response.json()) as DuplicateInstitutionGroup[]);
        }
      } catch {
        // silently fail — duplicates are supplemental
      } finally {
        setIsDuplicatesLoading(false);
      }
    })();
  }, []);

  async function handleMerge() {
    if (!mergeConfirm) return;
    setIsMerging(true);
    setMergeError(null);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(sessionError.message);
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("You must be signed in as an admin.");

      const response = await fetch(`${API_BASE_URL}/admin/institutions/merge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          primary_id: mergeConfirm.primaryId,
          duplicate_id: mergeConfirm.duplicateId,
        }),
      });

      if (!response.ok) {
        let message = "Could not merge institutions.";
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) message = body.detail;
        } catch {}
        throw new Error(message);
      }

      const refreshResponse = await fetch(`${API_BASE_URL}/admin/institutions/duplicates`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (refreshResponse.ok) {
        setDuplicateGroups((await refreshResponse.json()) as DuplicateInstitutionGroup[]);
      }
      setMergeConfirm(null);
      router.refresh();
    } catch (mergeErr) {
      setMergeError(mergeErr instanceof Error ? mergeErr.message : "Could not merge institutions.");
    } finally {
      setIsMerging(false);
    }
  }

  async function handleCloseBoardPost(postId: string) {
    setClosingPostId(postId);
    setBoardPostError(null);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in as an admin to close a board post.");
      }

      const response = await fetch(`${API_BASE_URL}/admin/board-posts/${postId}/close`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        let message = "Could not close the board post.";
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) {
            message = body.detail;
          }
        } catch {}
        throw new Error(message);
      }

      router.refresh();
    } catch (closeError) {
      setBoardPostError(closeError instanceof Error ? closeError.message : "Could not close the board post.");
    } finally {
      setClosingPostId(null);
    }
  }

  const sectionCounts: Record<AdminSectionId, number> = {
    "institution-verification": filteredInstitutions.length,
    "listing-moderation": filteredListings.length,
    "request-competition": groupedCompetitionRequests.length,
    "request-board": filteredBoardPosts.length,
    "duplicate-institutions": duplicateGroups.length,
  };

  return (
    <>
      <DashboardShell
        brandSubtitle="Admin workspace"
        header={
          <>
            <OperationsHeader
              eyebrow="Admin workspace"
              title={
                <>
                  Admin <Highlight>Dashboard</Highlight>
                </>
              }
            />
            <OperationsMetricGrid
              items={[
                {
                  label: "Pending Approvals",
                  value: dashboard.pending_institutions.length + dashboard.listings_for_review.length,
                },
                {
                  label: "Total Donations",
                  value: dashboard.recent_actions.length,
                },
                {
                  label: "Successful Deliveries",
                  value: dashboard.active_threads.length,
                },
              ]}
            />
          </>
        }
        sections={[
          {
            id: ADMIN_SECTION_ORDER[0].id,
            title: ADMIN_SECTION_ORDER[0].title,
            count: sectionCounts[ADMIN_SECTION_ORDER[0].id],
            icon: ADMIN_SECTION_ORDER[0].icon,
            content: (
              <>
            <div className="admin-filter-bar">
              <input
                type="search"
                className="admin-filter-search"
                placeholder="Search by name or location..."
                value={institutionSearch}
                onChange={(e) => setInstitutionSearch(e.target.value)}
              />
              {institutionStatuses.length > 1 && (
                <select
                  className="admin-filter-select"
                  value={institutionStatusFilter}
                  onChange={(e) => setInstitutionStatusFilter(e.target.value)}
                >
                  <option value="">All statuses</option>
                  {institutionStatuses.map((s) => (
                    <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                  ))}
                </select>
              )}
              {institutionTypes.length > 1 && (
                <select
                  className="admin-filter-select"
                  value={institutionTypeFilter}
                  onChange={(e) => setInstitutionTypeFilter(e.target.value)}
                >
                  <option value="">All types</option>
                  {institutionTypes.map((t) => (
                    <option key={t} value={t}>{t.replaceAll("_", " ")}</option>
                  ))}
                </select>
              )}
            </div>
            <OperationsTableSection
              title="Institution Reviews"
              hideTitle
              columns={["Institution", "Location", "Status", ""]}
              footer={<span>Showing {filteredInstitutions.length} of {dashboard.pending_institutions.length} institution review item(s)</span>}
            >
              {filteredInstitutions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ops-table-empty-cell">
                    <div className="ops-empty-state">{dashboard.pending_institutions.length === 0 ? "No institution reviews waiting right now." : "No institutions match the current filters."}</div>
                  </td>
                </tr>
              ) : (
                filteredInstitutions.map((institution) => (
                  <tr
                    key={institution.id}
                    className="ops-table-row ops-table-row-clickable"
                    onClick={() => setSelectedInstitution(institution)}
                  >
                    <td>
                      <div>
                        <p className="ops-equipment-title">{institution.name}</p>
                        <p className="ops-equipment-subtitle">{institution.type.replaceAll("_", " ")}</p>
                      </div>
                    </td>
                    <td>{institution.location}</td>
                    <td>
                      <StatusPill status={institution.verification_status} />
                    </td>
                    <td className="ops-table-align-right">
                      <span className="ops-table-linkish">Open review</span>
                    </td>
                  </tr>
                ))
              )}
            </OperationsTableSection>
              </>
            ),
          },
          {
            id: ADMIN_SECTION_ORDER[1].id,
            title: ADMIN_SECTION_ORDER[1].title,
            count: sectionCounts[ADMIN_SECTION_ORDER[1].id],
            icon: ADMIN_SECTION_ORDER[1].icon,
            content: (
              <>
            <div className="admin-filter-bar">
              <input
                type="search"
                className="admin-filter-search"
                placeholder="Search by title, category, or location..."
                value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
              />
              {listingStatuses.length > 1 && (
                <select
                  className="admin-filter-select"
                  value={listingStatusFilter}
                  onChange={(e) => setListingStatusFilter(e.target.value)}
                >
                  <option value="">All statuses</option>
                  {listingStatuses.map((s) => (
                    <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                  ))}
                </select>
              )}
              {listingCategories.length > 1 && (
                <select
                  className="admin-filter-select"
                  value={listingCategoryFilter}
                  onChange={(e) => setListingCategoryFilter(e.target.value)}
                >
                  <option value="">All categories</option>
                  {listingCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>
            <OperationsTableSection
              title="Listing Reviews"
              hideTitle
              columns={["Equipment", "Institution", "Condition", "Status"]}
              footer={<span>Showing {filteredListings.length} of {dashboard.listings_for_review.length} listing review item(s)</span>}
            >
              {filteredListings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ops-table-empty-cell">
                    <div className="ops-empty-state">{dashboard.listings_for_review.length === 0 ? "No listings currently need moderation." : "No listings match the current filters."}</div>
                  </td>
                </tr>
              ) : (
                filteredListings.map((listing) => (
                  <tr
                    key={listing.id}
                    className="ops-table-row ops-table-row-clickable"
                    onClick={() => setSelectedListing(listing)}
                  >
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
                    <td>{listing.location}</td>
                    <td>
                      <span className="ops-condition-badge">{listing.condition}</span>
                    </td>
                    <td className="ops-table-align-right">
                      <StatusPill status={listing.status} />
                    </td>
                  </tr>
                ))
              )}
            </OperationsTableSection>
              </>
            ),
          },
          {
            id: ADMIN_SECTION_ORDER[2].id,
            title: ADMIN_SECTION_ORDER[2].title,
            count: sectionCounts[ADMIN_SECTION_ORDER[2].id],
            icon: ADMIN_SECTION_ORDER[2].icon,
            content: (
              <>
            <div className="admin-filter-bar">
              <input
                type="search"
                className="admin-filter-search"
                placeholder="Search by listing title or institution..."
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
              />
            </div>
            <OperationsTableSection
              title="Recipient Selection"
              hideTitle
              columns={["Listing", "Recipients", "Primary Status", ""]}
              footer={<span>Showing {groupedCompetitionRequests.length} recipient selection item(s)</span>}
            >
              {groupedCompetitionRequests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ops-table-empty-cell">
                    <div className="ops-empty-state">No recipient selection items yet.</div>
                  </td>
                </tr>
              ) : (
                groupedCompetitionRequests.map(([listingId, group]) => {
                  const matchedRequest = group.requests.find((request) => request.status === "approved_matched");
                  const primaryStatus = matchedRequest?.status ?? group.requests[0]?.status ?? "submitted";
                  const urgencyLabel = matchedRequest?.program_or_department ?? group.requests[0]?.program_or_department;
                  const isCompetitionListingInactive = group.listing?.status === "pending_admin_approval";

                  return (
                    <tr
                      key={listingId}
                      className={`ops-table-row${isCompetitionListingInactive ? " ops-table-row-muted" : " ops-table-row-clickable"}`}
                      onClick={isCompetitionListingInactive ? undefined : () => setSelectedCompetitionListingId(listingId)}
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
                            <p className="ops-equipment-title">{group.listing?.title ?? `Listing ${listingId}`}</p>
                            <p className="ops-equipment-subtitle">
                              {matchedRequest
                                ? `Matched institution: ${urgencyLabel}`
                                : "Choose which recipient institution receives this listing."}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="admin-ops-competition-cell">
                          <strong>{group.requests.length} request(s)</strong>
                          {matchedRequest ? <span>Recipient selected</span> : null}
                        </div>
                      </td>
                      <td>
                        <StatusPill status={primaryStatus} />
                      </td>
                      <td className="ops-table-align-right">
                        <span className="ops-table-linkish">{isCompetitionListingInactive ? "Unavailable" : "Open review"}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </OperationsTableSection>
              </>
            ),
          },
          {
            id: ADMIN_SECTION_ORDER[3].id,
            title: ADMIN_SECTION_ORDER[3].title,
            count: sectionCounts[ADMIN_SECTION_ORDER[3].id],
            icon: ADMIN_SECTION_ORDER[3].icon,
            content: (
              <>
            <div className="admin-filter-bar">
              <input
                type="search"
                className="admin-filter-search"
                placeholder="Search by title or description..."
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
              />
              <select
                className="admin-filter-select"
                value={boardStatusFilter}
                onChange={(e) => setBoardStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="open">open</option>
                <option value="match_in_progress">match in progress</option>
                <option value="closed">closed</option>
              </select>
              {boardCategories.length > 1 && (
                <select
                  className="admin-filter-select"
                  value={boardCategoryFilter}
                  onChange={(e) => setBoardCategoryFilter(e.target.value)}
                >
                  <option value="">All categories</option>
                  {boardCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>
            <OperationsTableSection
              title="Request Board"
              hideTitle
              columns={["Post", "Institution", "Equipment Type", "Status", ""]}
              footer={<span>Showing {filteredBoardPosts.length} of {dashboard.board_posts.length} board post(s)</span>}
            >
              {filteredBoardPosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ops-table-empty-cell">
                    <div className="ops-empty-state">{dashboard.board_posts.length === 0 ? "No board posts yet." : "No board posts match the current filters."}</div>
                  </td>
                </tr>
              ) : (
                filteredBoardPosts.map((post) => (
                  <tr key={post.id} className="ops-table-row">
                    <td>
                      <div>
                        <p className="ops-equipment-title">{post.title}</p>
                        <p className="ops-equipment-subtitle">{post.description}</p>
                      </div>
                    </td>
                    <td>{post.institution_id}</td>
                    <td>{post.category}</td>
                    <td>
                      <StatusPill status={post.status} />
                    </td>
                    <td className="ops-table-align-right">
                      {post.status !== "closed" ? (
                        <button
                          type="button"
                          className="button button-outline"
                          onClick={() => void handleCloseBoardPost(post.id)}
                          disabled={closingPostId === post.id}
                        >
                          {closingPostId === post.id ? "Closing..." : "Close post"}
                        </button>
                      ) : (
                        <span className="ops-table-linkish">Closed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </OperationsTableSection>
            {boardPostError ? <p className="auth-notice auth-notice-error">{boardPostError}</p> : null}
              </>
            ),
          },
          {
            id: ADMIN_SECTION_ORDER[4].id,
            title: ADMIN_SECTION_ORDER[4].title,
            count: sectionCounts[ADMIN_SECTION_ORDER[4].id],
            icon: ADMIN_SECTION_ORDER[4].icon,
            content: (
              <>
            <OperationsTableSection
              title="Duplicate Institutions"
              hideTitle
              columns={["Institution", "Location", "Status", ""]}
              footer={<span>Showing {duplicateGroups.length} duplicate group(s)</span>}
            >
              {isDuplicatesLoading ? (
                <tr>
                  <td colSpan={4} className="ops-table-empty-cell">
                    <div className="ops-empty-state">Loading duplicate detection...</div>
                  </td>
                </tr>
              ) : duplicateGroups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ops-table-empty-cell">
                    <div className="ops-empty-state">No duplicate institutions detected.</div>
                  </td>
                </tr>
              ) : (
                duplicateGroups.map((group, groupIndex) => (
                  <tr key={groupIndex} className="ops-table-row">
                    <td>
                      <div className="admin-duplicate-group">
                        {group.institutions.map((inst) => (
                          <div key={inst.id} className="admin-duplicate-item">
                            <p className="ops-equipment-title">{inst.name}</p>
                            <p className="ops-equipment-subtitle">{inst.type.replaceAll("_", " ")}</p>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="admin-duplicate-group">
                        {group.institutions.map((inst) => (
                          <div key={inst.id} className="admin-duplicate-item">
                            {inst.location}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="admin-duplicate-group">
                        {group.institutions.map((inst) => (
                          <div key={inst.id} className="admin-duplicate-item">
                            <StatusPill status={inst.verification_status} />
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="ops-table-align-right">
                      {group.institutions.length === 2 ? (
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() =>
                            setMergeConfirm({
                              group,
                              primaryId: group.institutions[0].id,
                              duplicateId: group.institutions[1].id,
                            })
                          }
                        >
                          Merge
                        </button>
                      ) : (
                        <span className="ops-table-linkish">Review ({group.institutions.length} matches)</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </OperationsTableSection>
              </>
            ),
          },
        ]}
      />

      {mergeConfirm ? (
        <div className="review-modal-overlay" role="presentation" onClick={() => { setMergeConfirm(null); setMergeError(null); }}>
          <section
            className="review-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="merge-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="review-modal-header">
              <div>
                <span className="eyebrow">Merge institutions</span>
                <h2 id="merge-confirm-title">Confirm institution merge</h2>
              </div>
              <button type="button" className="button button-outline" onClick={() => { setMergeConfirm(null); setMergeError(null); }}>
                Close
              </button>
            </div>

            <div className="review-modal-section">
              <p>
                All users, listings, requests, and board posts from the duplicate institution will be reassigned
                to the primary institution. The duplicate will be permanently deleted.
              </p>
            </div>

            <div className="admin-merge-selection">
              {mergeConfirm.group.institutions.map((inst) => (
                <label key={inst.id} className={`admin-merge-option ${mergeConfirm.primaryId === inst.id ? "admin-merge-option-selected" : ""}`}>
                  <input
                    type="radio"
                    name="primary-institution"
                    value={inst.id}
                    checked={mergeConfirm.primaryId === inst.id}
                    onChange={() =>
                      setMergeConfirm({
                        ...mergeConfirm,
                        primaryId: inst.id,
                        duplicateId: mergeConfirm.group.institutions.find((i) => i.id !== inst.id)?.id ?? "",
                      })
                    }
                  />
                  <div>
                    <strong>{inst.name}</strong>
                    <span>{inst.location}</span>
                    <StatusPill status={inst.verification_status} />
                    <span className="admin-merge-role-tag">{mergeConfirm.primaryId === inst.id ? "Primary (keep)" : "Duplicate (delete)"}</span>
                  </div>
                </label>
              ))}
            </div>

            {mergeError ? <p className="auth-notice auth-notice-error">{mergeError}</p> : null}

            <div className="page-actions" style={{ marginTop: "1rem" }}>
              <button type="button" className="button button-outline" onClick={() => { setMergeConfirm(null); setMergeError(null); }} disabled={isMerging}>
                Cancel
              </button>
              <button type="button" className="button button-primary" onClick={handleMerge} disabled={isMerging}>
                {isMerging ? "Merging..." : "Merge institutions"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {selectedInstitution ? (
        <InstitutionReviewModal institution={selectedInstitution} onClose={() => setSelectedInstitution(null)} />
      ) : null}

      {selectedListing ? <ListingReviewModal listing={selectedListing} onClose={() => setSelectedListing(null)} /> : null}
      {selectedCompetitionListingId ? (
        <RequestCompetitionModal
          listingId={selectedCompetitionListingId}
          onClose={() => setSelectedCompetitionListingId(null)}
        />
      ) : null}
    </>
  );
}

function RequestCompetitionModal({
  listingId,
  onClose,
}: {
  listingId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<ListingDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw new Error(sessionError.message);
        }

        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("You must be signed in as an admin to review recipient selection.");
        }

        const response = await fetch(`${API_BASE_URL}/admin/listings/${listingId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          let message = "Could not load the recipient selection view.";
          try {
            const body = (await response.json()) as { detail?: string };
            if (body.detail) {
              message = body.detail;
            }
          } catch {}
          throw new Error(message);
        }

        const nextDetail = (await response.json()) as ListingDetailResponse;
        setDetail(nextDetail);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load the recipient selection view.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [listingId]);

  async function handleSelectRecipient(requestId: string) {
    setSelectedRequestId(requestId);
    setError(null);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in as an admin to select a recipient.");
      }

      const response = await fetch(`${API_BASE_URL}/admin/requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status: "approved_matched",
        }),
      });

      if (!response.ok) {
        let message = "Could not update the request status.";
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) {
            message = body.detail;
          }
        } catch {}
        throw new Error(message);
      }

      router.refresh();
      onClose();
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : "Could not update the request status.");
    } finally {
      setSelectedRequestId(null);
    }
  }

  async function handleCancelMatch() {
    setIsCancelling(true);
    setError(null);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in as an admin to cancel the match.");
      }

      const response = await fetch(`${API_BASE_URL}/admin/listings/${listingId}/cancel-match`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        let message = "Could not cancel the current match.";
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) {
            message = body.detail;
          }
        } catch {}
        throw new Error(message);
      }

      router.refresh();
      onClose();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Could not cancel the current match.");
    } finally {
      setIsCancelling(false);
    }
  }

  const hasMatchedRequest = Boolean(detail?.related_requests.some((request) => request.status === "approved_matched"));

  return (
    <div className="review-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="review-modal-card review-modal-card-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`request-competition-${listingId}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="review-modal-header">
          <div>
            <span className="eyebrow">Recipient selection</span>
            <h2 id={`request-competition-${listingId}`}>{detail?.listing.title ?? "Loading listing..."}</h2>
          </div>
          <div className="page-actions" style={{ marginTop: 0 }}>
            {hasMatchedRequest ? (
              <button type="button" className="button button-outline" onClick={handleCancelMatch} disabled={isCancelling}>
                {isCancelling ? "Cancelling..." : "Cancel match"}
              </button>
            ) : null}
            <button type="button" className="button button-outline" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {isLoading ? <p className="auth-notice">Loading recipient selection...</p> : null}
        {error ? <p className="auth-notice auth-notice-error">{error}</p> : null}

        {detail ? (
          <div className="list">
            {detail.related_requests.map((request) => (
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
                <div className="list-row-actions">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => handleSelectRecipient(request.id)}
                    disabled={selectedRequestId === request.id}
                  >
                    {selectedRequestId === request.id ? "Selecting..." : "Select recipient"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function InstitutionReviewModal({
  institution,
  onClose,
}: {
  institution: Institution;
  onClose: () => void;
}) {
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState(institution.verification_status);
  const [adminNote, setAdminNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in as an admin to update institution status.");
      }

      const response = await fetch(`${API_BASE_URL}/admin/institutions/${institution.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ verification_status: verificationStatus, admin_note: adminNote.trim() || undefined }),
      });

      if (!response.ok) {
        let message = "Could not update the institution status.";
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) {
            message = body.detail;
          }
        } catch {}
        throw new Error(message);
      }

      router.refresh();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not update the institution status.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="review-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="review-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`institution-review-${institution.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="review-modal-header">
          <div>
            <span className="eyebrow">Institution review</span>
            <h2 id={`institution-review-${institution.id}`}>{institution.name}</h2>
          </div>
          <button type="button" className="button button-outline" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="review-modal-section">
          <div className="list-row-topline">
            <strong>{institution.type.replaceAll("_", " ")}</strong>
            <StatusPill status={institution.verification_status} />
          </div>
          <p>{institution.description}</p>
        </div>

        <div className="review-detail-grid">
          <div className="review-detail-card">
            <span>Location</span>
            <strong>{institution.location}</strong>
          </div>
          <div className="review-detail-card">
            <span>Institution ID</span>
            <strong>{institution.id}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="review-modal-form">
          <div className="auth-field">
            <label htmlFor={`institution-status-${institution.id}`}>Verification status</label>
            <select
              id={`institution-status-${institution.id}`}
              name="verificationStatus"
              value={verificationStatus}
              onChange={(event) => setVerificationStatus(event.target.value as Institution["verification_status"])}
            >
              <option value="pending_verification">Pending verification</option>
              <option value="verified">Verify institution</option>
              <option value="rejected">Reject institution</option>
              <option value="suspended">Suspend institution</option>
            </select>
          </div>
          <div className="auth-field">
            <label htmlFor={`institution-note-${institution.id}`}>Admin note</label>
            <textarea
              id={`institution-note-${institution.id}`}
              name="adminNote"
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              rows={3}
              placeholder="Optional note included in the institution notification"
            />
          </div>
          <button type="submit" className="button button-primary" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update status"}
          </button>
        </form>
        {error ? <p className="auth-notice auth-notice-error">{error}</p> : null}
      </section>
    </div>
  );
}

function ListingReviewModal({
  listing,
  onClose,
}: {
  listing: Listing;
  onClose: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(listing.status);
  const [adminNote, setAdminNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemovalConfirmOpen, setIsRemovalConfirmOpen] = useState(false);
  const [detail, setDetail] = useState<InternalListingDetailResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw new Error(sessionError.message);
        }

        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("You must be signed in as an admin to review this listing.");
        }

        const response = await fetch(`${API_BASE_URL}/admin/listings/${listing.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          let message = "Could not load the listing review details.";
          try {
            const body = (await response.json()) as { detail?: string };
            if (body.detail) {
              message = body.detail;
            }
          } catch {}
          throw new Error(message);
        }

        setDetail((await response.json()) as InternalListingDetailResponse);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load the listing review details.");
      } finally {
        setIsDetailLoading(false);
      }
    })();
  }, [listing.id]);

  const reviewListing = detail?.listing ?? listing;
  const documents = detail?.documents ?? [];

  async function submitStatusUpdate() {
    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in as an admin to update listing status.");
      }

      const response = await fetch(`${API_BASE_URL}/admin/listings/${listing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status, admin_note: adminNote.trim() || undefined }),
      });

      if (!response.ok) {
        let message = "Could not update the listing status.";
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) {
            message = body.detail;
          }
        } catch {}
        throw new Error(message);
      }

      router.refresh();
      onClose();
      return true;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not update the listing status.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status === "removed_by_admin") {
      setIsRemovalConfirmOpen(true);
      return;
    }

    await submitStatusUpdate();
  }

  return (
    <div className="review-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="review-modal-card review-modal-card-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`listing-review-${reviewListing.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="review-modal-header">
          <div>
            <span className="eyebrow">Listing review</span>
            <h2 id={`listing-review-${reviewListing.id}`}>{reviewListing.title}</h2>
          </div>
          <button type="button" className="button button-outline" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="review-modal-layout">
          <div className="review-modal-image">
            {reviewListing.photo_urls[0] ? (
              <Image
                src={reviewListing.photo_urls[0]}
                alt={reviewListing.title}
                fill
                sizes="(max-width: 980px) 100vw, 40vw"
                className="listing-card-image"
              />
            ) : (
              <div className="review-modal-image-empty">No image uploaded</div>
            )}
          </div>

          <div className="review-modal-content">
            <div className="list-row-topline">
              <strong>{reviewListing.category}</strong>
              <StatusPill status={reviewListing.status} />
            </div>
            <p>{reviewListing.description}</p>

            <div className="review-detail-grid">
              <div className="review-detail-card">
                <span>Condition</span>
                <strong>{reviewListing.condition}</strong>
              </div>
              <div className="review-detail-card">
                <span>Quantity</span>
                <strong>{reviewListing.quantity}</strong>
              </div>
              <div className="review-detail-card">
                <span>Location</span>
                <strong>{reviewListing.location}</strong>
              </div>
              <div className="review-detail-card">
                <span>Posted</span>
                <strong>{formatDate(reviewListing.created_at)}</strong>
              </div>
              <div className="review-detail-card">
                <span>Availability window</span>
                <strong>{reviewListing.availability_window}</strong>
              </div>
              <div className="review-detail-card">
                <span>Request count</span>
                <strong>{reviewListing.request_count}</strong>
              </div>
            </div>

            <div className="review-modal-section">
              <h3>Operational details</h3>
              <dl className="review-spec-grid">
                <div>
                  <dt>Handling requirements</dt>
                  <dd>{reviewListing.handling_requirements}</dd>
                </div>
                <div>
                  <dt>Dimensions and weight</dt>
                  <dd>{reviewListing.dimensions_weight}</dd>
                </div>
                <div>
                  <dt>Working status</dt>
                  <dd>{reviewListing.working_status}</dd>
                </div>
                <div>
                  <dt>Documentation included</dt>
                  <dd>{reviewListing.documentation_included}</dd>
                </div>
                <div>
                  <dt>Special handling flags</dt>
                  <dd>{reviewListing.special_handling_flags}</dd>
                </div>
                <div>
                  <dt>Delivery mode</dt>
                  <dd>{reviewListing.delivery_mode.replaceAll("_", " ")}</dd>
                </div>
              </dl>
            </div>

            <div className="review-modal-section">
              <h3>Compliance Forms</h3>
              {isDetailLoading ? <p>Loading compliance documents...</p> : null}
              {!isDetailLoading && documents.length === 0 ? (
                <p>No compliance PDFs are attached to this listing.</p>
              ) : null}
              {!isDetailLoading && documents.length > 0 ? (
                <div className="admin-document-grid">
                  {documents.map((document) => (
                    <article key={document.form_type} className="admin-document-card">
                      <div className="admin-document-card-header">
                        <div>
                          <strong>{document.title}</strong>
                          <p>
                            {document.completed_by_name
                              ? `Completed by ${document.completed_by_name}`
                              : "Not yet completed"}
                            {document.completed_at
                              ? ` on ${new Date(document.completed_at).toLocaleDateString()}`
                              : ""}
                          </p>
                        </div>
                        <span className={`admin-document-badge admin-document-badge-${document.status}`}>
                          {document.status.replaceAll("_", " ")}
                        </span>
                      </div>

                      {document.preview_url ? (
                        <iframe
                          title={`${document.title} preview`}
                          src={document.preview_url}
                          className="admin-document-preview"
                        />
                      ) : (
                        <div className="admin-document-preview admin-document-preview-empty">No PDF preview available</div>
                      )}

                      <div className="admin-document-actions">
                        {document.download_url ? (
                          <a
                            className="button button-secondary"
                            href={document.download_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Download PDF
                          </a>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} className="review-modal-form">
              <div className="auth-field">
                <label htmlFor={`listing-status-${reviewListing.id}`}>Change Listing Status</label>
                <select
                  id={`listing-status-${reviewListing.id}`}
                  name="status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as Listing["status"])}
                >
                  {reviewListing.status !== "matched_reserved" && reviewListing.status !== "rejected" ? (
                    <option value="pending_admin_approval">Pending</option>
                  ) : null}
                  {reviewListing.status === "pending_admin_approval" ? (
                    <option value="rejected">Rejected</option>
                  ) : null}
                  {reviewListing.status !== "matched_reserved" && reviewListing.status !== "rejected" ? (
                    <option value="live">Approved</option>
                  ) : null}
                  {reviewListing.status === "rejected" ? <option value="rejected">Rejected</option> : null}
                  {reviewListing.status === "matched_reserved" ? <option value="matched_reserved">Match reserved</option> : null}
                  <option value="removed_by_admin">Remove from marketplace</option>
                </select>
              </div>
              <div className="auth-field">
                <label htmlFor={`listing-note-${reviewListing.id}`}>Admin note</label>
                <textarea
                  id={`listing-note-${reviewListing.id}`}
                  name="adminNote"
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  rows={3}
                  placeholder="Optional note included in the donor notification"
                />
              </div>
              <button type="submit" className="button button-primary" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update status"}
              </button>
            </form>
            {error ? <p className="auth-notice auth-notice-error">{error}</p> : null}
          </div>
        </div>

        {isRemovalConfirmOpen ? (
          <div className="review-modal-confirm">
            <div>
              <span className="eyebrow eyebrow-subtle">Confirm removal</span>
              <h3>Are you sure you want to remove this listing from the marketplace?</h3>
              <p>
                This will hide the listing from normal marketplace views and mark it as removed by admin. The listing
                record will still remain in the system.
              </p>
            </div>
            <div className="page-actions" style={{ marginTop: 0 }}>
              <button
                type="button"
                className="button button-outline"
                onClick={() => setIsRemovalConfirmOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  void submitStatusUpdate().then((didSucceed) => {
                    if (didSucceed) {
                      setIsRemovalConfirmOpen(false);
                    }
                  });
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Removing..." : "Yes, remove listing"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
