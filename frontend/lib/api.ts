import { getAccessToken } from "@/lib/auth";
import type {
  AdminDashboardResponse,
  AuthenticatedUser,
  DonorDashboardResponse,
  Listing,
  ListingDetailResponse,
  RecipientDashboardResponse,
  RequestBoardPost,
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

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

export async function getCurrentProfile(): Promise<AuthenticatedUser | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  return fetchJson<AuthenticatedUser>("/auth/me");
}

export async function getPublicListings(): Promise<Listing[]> {
  const apiResult = await fetchJson<Listing[]>("/public/listings");
  return apiResult ?? [];
}

export async function getListingDetail(listingId: string): Promise<ListingDetailResponse | null> {
  return fetchJson<ListingDetailResponse>(`/public/listings/${listingId}`);
}

export async function getDonorDashboard(): Promise<DonorDashboardResponse | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  return fetchJson<DonorDashboardResponse>("/donor/dashboard");
}

export async function getDonorRequestBoard(): Promise<RequestBoardPost[] | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  return fetchJson<RequestBoardPost[]>("/donor/request-board");
}

export async function getRecipientDashboard(): Promise<RecipientDashboardResponse | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  return fetchJson<RecipientDashboardResponse>("/recipient/dashboard");
}

export async function getAdminDashboard(): Promise<AdminDashboardResponse | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  return fetchJson<AdminDashboardResponse>("/admin/dashboard");
}
