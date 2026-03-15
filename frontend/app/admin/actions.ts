"use server";

import { revalidatePath } from "next/cache";

import { getAccessToken } from "@/lib/auth";
import { getCurrentProfile } from "@/lib/api";
import type { ListingStatus } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export async function updateListingStatusAction(formData: FormData) {
  const accessToken = await getAccessToken();
  const profile = await getCurrentProfile();

  if (!accessToken || profile?.user.role !== "admin") {
    throw new Error("Admin access required.");
  }

  const listingId = formData.get("listingId");
  const status = formData.get("status");

  if (typeof listingId !== "string" || typeof status !== "string") {
    throw new Error("Listing moderation payload is incomplete.");
  }

  const response = await fetch(`${API_BASE_URL}/admin/listings/${listingId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      status: status as ListingStatus,
    }),
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

  revalidatePath("/admin");
  revalidatePath("/donor");
  revalidatePath("/listings");
}
