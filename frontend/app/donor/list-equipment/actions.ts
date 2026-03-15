"use server";

import { revalidatePath } from "next/cache";

import { getAccessToken } from "@/lib/auth";

export type ListingFormState = {
  error: string | null;
  success: boolean;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

function getRequiredString(formData: FormData, key: string, label: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

async function uploadListingImage(accessToken: string, file: File) {
  const imageFormData = new FormData();
  imageFormData.append("image", file);

  const response = await fetch(`${API_BASE_URL}/donor/listing-images`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: imageFormData,
  });

  if (!response.ok) {
    let message = "Could not upload the listing image.";
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        message = body.detail;
      }
    } catch {}
    throw new Error(message);
  }

  const body = (await response.json()) as { photo_url: string };
  return body.photo_url;
}

export async function submitListingAction(_previousState: ListingFormState, formData: FormData): Promise<ListingFormState> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "You must be signed in as a donor to create a listing.", success: false };
    }

    const quantityValue = getRequiredString(formData, "quantity", "Quantity");
    const quantity = Number(quantityValue);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { error: "Quantity must be a whole number greater than zero.", success: false };
    }

    const image = formData.get("image");
    const photoUrls: string[] = [];

    if (image instanceof File && image.size > 0) {
      photoUrls.push(await uploadListingImage(accessToken, image));
    }

    const response = await fetch(`${API_BASE_URL}/donor/listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        title: getRequiredString(formData, "title", "Equipment title"),
        category: getRequiredString(formData, "category", "Category"),
        condition: getRequiredString(formData, "condition", "Condition"),
        quantity,
        location: getRequiredString(formData, "location", "Location"),
        availability_window: getRequiredString(formData, "availability_window", "Availability window"),
        description: getRequiredString(formData, "description", "Description"),
        dimensions_weight: getRequiredString(formData, "dimensions_weight", "Dimensions and weight"),
        handling_requirements: getRequiredString(formData, "handling_requirements", "Handling requirements"),
        working_status: getRequiredString(formData, "working_status", "Working status"),
        documentation_included: getRequiredString(formData, "documentation_included", "Documentation included"),
        special_handling_flags: getRequiredString(formData, "special_handling_flags", "Special handling flags"),
        delivery_mode: getRequiredString(formData, "delivery_mode", "Delivery mode"),
        photo_urls: photoUrls,
      }),
    });

    if (!response.ok) {
      let message = "Could not create the equipment listing.";
      try {
        const body = (await response.json()) as { detail?: string };
        if (body.detail) {
          message = body.detail;
        }
      } catch {}
      return { error: message, success: false };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create the equipment listing.", success: false };
  }

  revalidatePath("/donor");
  revalidatePath("/admin");
  revalidatePath("/listings");
  return { error: null, success: true };
}
