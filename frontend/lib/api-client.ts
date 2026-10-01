import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Listing, RequestBoardPost, RequestBoardPostCreate } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

async function fetchAuthedJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  const {
    data: { session },
  } = await createSupabaseBrowserClient().auth.getSession();
  if (!session?.access_token) {
    return null;
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getDonorRequestBoard(): Promise<RequestBoardPost[] | null> {
  return fetchAuthedJson<RequestBoardPost[]>("/donor/request-board");
}

export async function createListingFromBoardPost(postId: string): Promise<Listing | null> {
  return fetchAuthedJson<Listing>(`/donor/request-board/${postId}/create-listing`, { method: "POST" });
}

export async function createRequestBoardPost(payload: RequestBoardPostCreate): Promise<RequestBoardPost | null> {
  return fetchAuthedJson<RequestBoardPost>("/recipient/request-board", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function closeBoardPost(postId: string): Promise<RequestBoardPost | null> {
  return fetchAuthedJson<RequestBoardPost>(`/recipient/request-board/${postId}/close`, { method: "POST" });
}
