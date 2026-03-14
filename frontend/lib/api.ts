import {
  getAdminDashboardFromSeed,
  getDonorDashboardFromSeed,
  getListingDetailFromSeed,
  getPublicListingsFromSeed,
  getRecipientDashboardFromSeed,
  seed,
} from "@/lib/seed";
import { getAccessToken } from "@/lib/auth";
import type {
  AdminDashboardResponse,
  DonorDashboardResponse,
  Listing,
  ListingDetailResponse,
  RecipientDashboardResponse,
  RequestBoardPost,
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const accessToken = await getAccessToken();
    const headers = new Headers(init?.headers);

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getPublicListings(): Promise<Listing[]> {
  const apiResult = await fetchJson<Listing[]>("/public/listings");
  return apiResult ?? getPublicListingsFromSeed();
}

export async function getListingDetail(listingId: string): Promise<ListingDetailResponse | null> {
  const apiResult = await fetchJson<ListingDetailResponse>(`/public/listings/${listingId}`);
  return apiResult ?? getListingDetailFromSeed(listingId);
}

export async function getDonorDashboard(): Promise<DonorDashboardResponse> {
  const apiResult = await fetchJson<DonorDashboardResponse>("/donor/dashboard", {
    headers: {
      "X-LabLink-Role": "donor_lab",
      "X-User-Id": "user_donor_alex",
    },
  });

  return apiResult ?? getDonorDashboardFromSeed();
}

export async function getDonorRequestBoard(): Promise<RequestBoardPost[]> {
  const apiResult = await fetchJson<RequestBoardPost[]>("/donor/request-board", {
    headers: {
      "X-LabLink-Role": "donor_lab",
      "X-User-Id": "user_donor_alex",
    },
  });

  return apiResult ?? seed.request_board_posts;
}

export async function getRecipientDashboard(): Promise<RecipientDashboardResponse> {
  const apiResult = await fetchJson<RecipientDashboardResponse>("/recipient/dashboard", {
    headers: {
      "X-LabLink-Role": "recipient_institution",
      "X-User-Id": "user_recipient_maya",
    },
  });

  return apiResult ?? getRecipientDashboardFromSeed();
}

export async function getAdminDashboard(): Promise<AdminDashboardResponse> {
  const apiResult = await fetchJson<AdminDashboardResponse>("/admin/dashboard", {
    headers: {
      "X-LabLink-Role": "admin",
      "X-User-Id": "user_admin_riley",
    },
  });

  return apiResult ?? getAdminDashboardFromSeed();
}
