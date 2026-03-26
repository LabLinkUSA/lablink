import rawSeed from "../../shared/seed/lablink.seed.json";

import type {
  AdminDashboardResponse,
  DonorDashboardResponse,
  LabLinkSeed,
  ListingDetailResponse,
  ListingStatus,
  RecipientDashboardResponse,
} from "@/lib/types";

export const seed = rawSeed as LabLinkSeed;

export function getPublicListingsFromSeed() {
  const visibleStatuses: ListingStatus[] = ["live"];
  return [...seed.listings]
    .filter((listing) => visibleStatuses.includes(listing.status))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function getListingDetailFromSeed(listingId: string, includeRequests = false): ListingDetailResponse | null {
  const listing = seed.listings.find((entry) => entry.id === listingId);
  if (!listing || listing.status !== "live") {
    return null;
  }

  return {
    listing,
    donor_institution: seed.institutions.find((institution) => institution.id === listing.donor_institution_id)!,
    related_requests: includeRequests
      ? seed.equipment_requests.filter((request) => request.listing_id === listingId)
      : [],
  };
}

export function getDonorDashboardFromSeed(userId = "user_donor_alex"): DonorDashboardResponse {
  const user = seed.users.find((entry) => entry.id === userId)!;
  const institution = seed.institutions.find((entry) => entry.id === user.institution_id)!;
  const listings = seed.listings
    .filter((listing) => listing.donor_institution_id === institution.id)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const listingIds = new Set(listings.map((listing) => listing.id));
  const activeRequests = seed.equipment_requests
    .filter((request) => listingIds.has(request.listing_id) && request.status !== "rejected_cancelled")
    .sort((a, b) => (a.submitted_at < b.submitted_at ? 1 : -1));

  return {
    institution,
    listings,
    active_requests: activeRequests,
    impact_summary: {
      total_items_donated: listings.filter((listing) => listing.status === "fulfilled").reduce((sum, listing) => sum + listing.quantity, 0),
      institutions_served: new Set(
        seed.equipment_requests
          .filter(
            (request) =>
              listingIds.has(request.listing_id) &&
              ["approved_matched", "pickup_transfer_coordination", "completed"].includes(request.status),
          )
          .map((request) => request.recipient_institution_id),
      ).size,
      active_listings: listings.filter((listing) => ["live", "under_review"].includes(listing.status)).length,
    },
  };
}

export function getRecipientDashboardFromSeed(userId = "user_recipient_maya"): RecipientDashboardResponse {
  const user = seed.users.find((entry) => entry.id === userId)!;
  const institution = seed.institutions.find((entry) => entry.id === user.institution_id)!;
  const requests = seed.equipment_requests
    .filter((request) => {
      if (request.recipient_institution_id !== institution.id) {
        return false;
      }

      const listing = seed.listings.find((entry) => entry.id === request.listing_id);
      return listing ? !["removed_by_admin", "removed_by_donor"].includes(listing.status) : true;
    })
    .sort((a, b) => (a.submitted_at < b.submitted_at ? 1 : -1));
  const requestIds = new Set(requests.map((request) => request.id));

  return {
    institution,
    requests,
    saved_listings: getPublicListingsFromSeed()
      .filter((listing) => !["removed_by_admin", "removed_by_donor"].includes(listing.status))
      .slice(0, 3),
    threads: seed.message_threads.filter((thread) => thread.request_id && requestIds.has(thread.request_id)),
    request_board_posts: seed.request_board_posts.filter((post) => post.institution_id === institution.id),
  };
}

export function getAdminDashboardFromSeed(): AdminDashboardResponse {
  return {
    pending_institutions: seed.institutions.filter(
      (institution) => institution.type !== "admin" && institution.verification_status !== "verified",
    ),
    listings_for_review: seed.listings.filter((listing) =>
      ["pending_admin_approval", "under_review", "live", "matched_reserved"].includes(listing.status),
    ),
    requests_requiring_attention: seed.equipment_requests.filter((request) =>
      ["submitted", "admin_review", "awaiting_donor_confirmation"].includes(request.status) &&
      !["removed_by_admin", "removed_by_donor"].includes(
        seed.listings.find((listing) => listing.id === request.listing_id)?.status ?? "",
      ),
    ),
    active_threads: seed.message_threads.filter((thread) => thread.status === "active"),
    recent_actions: [...seed.admin_actions].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
  };
}
