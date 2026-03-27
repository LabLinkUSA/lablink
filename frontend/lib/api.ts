import { cache } from "react";

import { getAccessToken } from "@/lib/auth";
import type {
  AdminDashboardResponse,
  AuthenticatedUser,
  DonorDashboardResponse,
  InternalListingDetailResponse,
  Listing,
  ListingDocumentSaveResponse,
  ListingDocumentTemplatesResponse,
  ListingDetailResponse,
  RecipientDashboardResponse,
  RequestBoardPost,
  RecipientRequestStateResponse,
  SavedListingStateResponse,
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const headers = new Headers(init?.headers);

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

async function fetchAuthedJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return fetchJson<T>(path, {
    ...init,
    headers,
  });
}

export const getCurrentProfile = cache(async (): Promise<AuthenticatedUser | null> =>
  fetchAuthedJson<AuthenticatedUser>("/auth/me"),
);

export async function getPublicListings(): Promise<Listing[]> {
  const apiResult = await fetchJson<Listing[]>("/public/listings");
  return apiResult ?? [];
}

export async function getListingDetail(listingId: string): Promise<ListingDetailResponse | null> {
  return fetchJson<ListingDetailResponse>(`/public/listings/${listingId}`);
}

export async function getDonorDashboard(): Promise<DonorDashboardResponse | null> {
  return fetchAuthedJson<DonorDashboardResponse>("/donor/dashboard");
}

export async function getDonorRequestBoard(): Promise<RequestBoardPost[] | null> {
  return fetchAuthedJson<RequestBoardPost[]>("/donor/request-board");
}

export async function createDonorListingDraft(): Promise<Listing | null> {
  return fetchAuthedJson<Listing>("/donor/listings/drafts", { method: "POST" });
}

export async function getDonorListingDetail(listingId: string): Promise<InternalListingDetailResponse | null> {
  return fetchAuthedJson<InternalListingDetailResponse>(`/donor/listings/${listingId}`);
}

export async function getDonorListingFormTemplates(listingId: string): Promise<ListingDocumentTemplatesResponse | null> {
  return fetchAuthedJson<ListingDocumentTemplatesResponse>(`/donor/listings/${listingId}/form-templates`);
}

export async function getRecipientDashboard(): Promise<RecipientDashboardResponse | null> {
  return fetchAuthedJson<RecipientDashboardResponse>("/recipient/dashboard");
}

export async function getAdminDashboard(): Promise<AdminDashboardResponse | null> {
  return fetchAuthedJson<AdminDashboardResponse>("/admin/dashboard");
}

export async function saveDonorListingDocument(
  listingId: string,
  formType: string,
  payload: FormData,
): Promise<ListingDocumentSaveResponse | null> {
  return fetchAuthedJson<ListingDocumentSaveResponse>(`/donor/listings/${listingId}/documents/${formType}`, {
    method: "PUT",
    body: payload,
  });
}

export async function getRecipientSavedListingState(listingId: string): Promise<SavedListingStateResponse | null> {
  return fetchAuthedJson<SavedListingStateResponse>(`/recipient/saved-listings/${listingId}`);
}

export async function getRecipientRequestState(listingId: string): Promise<RecipientRequestStateResponse | null> {
  return fetchAuthedJson<RecipientRequestStateResponse>(`/recipient/requests/${listingId}/state`);
}
