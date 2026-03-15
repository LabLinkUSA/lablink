"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const supabase = createSupabaseBrowserClient();

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

export function DonorListingForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(event.currentTarget);

    startTransition(() => {
      void supabase.auth
        .getSession()
        .then(async ({ data, error: sessionError }) => {
          if (sessionError) {
            throw new Error(sessionError.message);
          }

          const accessToken = data.session?.access_token;
          if (!accessToken) {
            throw new Error("You must be signed in as a donor to create a listing.");
          }

          const quantityValue = getRequiredString(formData, "quantity", "Quantity");
          const quantity = Number(quantityValue);
          if (!Number.isInteger(quantity) || quantity < 1) {
            throw new Error("Quantity must be a whole number greater than zero.");
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
            throw new Error(message);
          }

          router.push("/donor");
          router.refresh();
        })
        .catch((submitError: unknown) => {
          setError(submitError instanceof Error ? submitError.message : "Could not create the equipment listing.");
        })
        .finally(() => {
          setIsPending(false);
        });
    });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field-grid">
        <div className="auth-field">
          <label htmlFor="title">Equipment title</label>
          <input id="title" name="title" type="text" placeholder="PCR thermal cycler" required />
        </div>
        <div className="auth-field">
          <label htmlFor="category">Category</label>
          <input id="category" name="category" type="text" placeholder="Molecular biology" required />
        </div>
      </div>

      <div className="auth-field-grid">
        <div className="auth-field">
          <label htmlFor="condition">Condition</label>
          <input id="condition" name="condition" type="text" placeholder="Gently used" required />
        </div>
        <div className="auth-field">
          <label htmlFor="quantity">Quantity</label>
          <input id="quantity" name="quantity" type="number" min="1" defaultValue="1" required />
        </div>
      </div>

      <div className="auth-field-grid">
        <div className="auth-field">
          <label htmlFor="location">Pickup location</label>
          <input id="location" name="location" type="text" placeholder="Boston, MA" required />
        </div>
        <div className="auth-field">
          <label htmlFor="availability_window">Availability window</label>
          <input id="availability_window" name="availability_window" type="text" placeholder="Available through June 2026" required />
        </div>
      </div>

      <div className="auth-field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" placeholder="Share what the equipment is, its use case, and any context a recipient should know." required />
      </div>

      <div className="auth-field-grid">
        <div className="auth-field">
          <label htmlFor="dimensions_weight">Dimensions and weight</label>
          <input id="dimensions_weight" name="dimensions_weight" type="text" placeholder='24" x 18" x 16", 35 lb' required />
        </div>
        <div className="auth-field">
          <label htmlFor="working_status">Working status</label>
          <input id="working_status" name="working_status" type="text" placeholder="Fully operational, last serviced January 2026" required />
        </div>
      </div>

      <div className="auth-field">
        <label htmlFor="handling_requirements">Handling requirements</label>
        <textarea id="handling_requirements" name="handling_requirements" placeholder="Include calibration needs, packing notes, hazardous material restrictions, or setup details." required />
      </div>

      <div className="auth-field-grid">
        <div className="auth-field">
          <label htmlFor="documentation_included">Documentation included</label>
          <input id="documentation_included" name="documentation_included" type="text" placeholder="User manual, maintenance logs, calibration certificate" required />
        </div>
        <div className="auth-field">
          <label htmlFor="special_handling_flags">Special handling flags</label>
          <input id="special_handling_flags" name="special_handling_flags" type="text" placeholder="Fragile optics, keep upright" required />
        </div>
      </div>

      <div className="auth-field-grid">
        <div className="auth-field">
          <label htmlFor="delivery_mode">Delivery mode</label>
          <select id="delivery_mode" name="delivery_mode" defaultValue="pickup_only" required>
            <option value="pickup_only">Pickup only</option>
            <option value="pickup_or_shipment">Pickup or shipment</option>
          </select>
        </div>
        <div className="auth-field">
          <label htmlFor="image">Equipment image</label>
          <input id="image" name="image" type="file" accept="image/*" />
        </div>
      </div>

      {error ? <p className="auth-notice auth-notice-error">{error}</p> : null}

      <button type="submit" className="button button-primary auth-submit" disabled={isPending}>
        {isPending ? "Submitting listing..." : "Submit for admin approval"}
      </button>
    </form>
  );
}
