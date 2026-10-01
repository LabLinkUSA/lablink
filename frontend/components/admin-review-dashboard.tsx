"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { BoardSection } from "@/components/admin/board-section";
import { RequestCompetitionModal } from "@/components/admin/competition-modal";
import { CompetitionSection } from "@/components/admin/competition-section";
import { DuplicatesSection } from "@/components/admin/duplicates-section";
import { InstitutionReviewModal } from "@/components/admin/institution-review-modal";
import { InstitutionSection } from "@/components/admin/institution-section";
import { ListingReviewModal } from "@/components/admin/listing-review-modal";
import { ListingSection } from "@/components/admin/listing-section";
import { MergeModal } from "@/components/admin/merge-modal";
import {
  OperationsHeader,
  OperationsMetricGrid,
} from "@/components/operations-dashboard-ui";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Highlight } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AdminDashboardResponse, DuplicateInstitutionGroup, Institution, Listing } from "@/lib/types";

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
              <InstitutionSection
                rows={filteredInstitutions}
                total={dashboard.pending_institutions.length}
                search={institutionSearch}
                onSearch={setInstitutionSearch}
                statusFilter={institutionStatusFilter}
                onStatusFilter={setInstitutionStatusFilter}
                statuses={institutionStatuses}
                typeFilter={institutionTypeFilter}
                onTypeFilter={setInstitutionTypeFilter}
                types={institutionTypes}
                onOpen={setSelectedInstitution}
              />
            ),
          },
          {
            id: ADMIN_SECTION_ORDER[1].id,
            title: ADMIN_SECTION_ORDER[1].title,
            count: sectionCounts[ADMIN_SECTION_ORDER[1].id],
            icon: ADMIN_SECTION_ORDER[1].icon,
            content: (
              <ListingSection
                rows={filteredListings}
                total={dashboard.listings_for_review.length}
                search={listingSearch}
                onSearch={setListingSearch}
                statusFilter={listingStatusFilter}
                onStatusFilter={setListingStatusFilter}
                statuses={listingStatuses}
                categoryFilter={listingCategoryFilter}
                onCategoryFilter={setListingCategoryFilter}
                categories={listingCategories}
                onOpen={setSelectedListing}
              />
            ),
          },
          {
            id: ADMIN_SECTION_ORDER[2].id,
            title: ADMIN_SECTION_ORDER[2].title,
            count: sectionCounts[ADMIN_SECTION_ORDER[2].id],
            icon: ADMIN_SECTION_ORDER[2].icon,
            content: (
              <CompetitionSection
                rows={groupedCompetitionRequests}
                search={requestSearch}
                onSearch={setRequestSearch}
                onOpen={setSelectedCompetitionListingId}
              />
            ),
          },
          {
            id: ADMIN_SECTION_ORDER[3].id,
            title: ADMIN_SECTION_ORDER[3].title,
            count: sectionCounts[ADMIN_SECTION_ORDER[3].id],
            icon: ADMIN_SECTION_ORDER[3].icon,
            content: (
              <BoardSection
                rows={filteredBoardPosts}
                total={dashboard.board_posts.length}
                search={boardSearch}
                onSearch={setBoardSearch}
                statusFilter={boardStatusFilter}
                onStatusFilter={setBoardStatusFilter}
                categoryFilter={boardCategoryFilter}
                onCategoryFilter={setBoardCategoryFilter}
                categories={boardCategories}
                closingPostId={closingPostId}
                error={boardPostError}
                onClosePost={(postId) => void handleCloseBoardPost(postId)}
              />
            ),
          },
          {
            id: ADMIN_SECTION_ORDER[4].id,
            title: ADMIN_SECTION_ORDER[4].title,
            count: sectionCounts[ADMIN_SECTION_ORDER[4].id],
            icon: ADMIN_SECTION_ORDER[4].icon,
            content: (
              <DuplicatesSection
                groups={duplicateGroups}
                isLoading={isDuplicatesLoading}
                onMerge={(group) =>
                  setMergeConfirm({
                    group,
                    primaryId: group.institutions[0].id,
                    duplicateId: group.institutions[1].id,
                  })
                }
              />
            ),
          },
        ]}
      />

      {mergeConfirm ? (
        <MergeModal
          mergeConfirm={mergeConfirm}
          onChange={setMergeConfirm}
          onClose={() => { setMergeConfirm(null); setMergeError(null); }}
          onConfirm={handleMerge}
          isMerging={isMerging}
          error={mergeError}
        />
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
