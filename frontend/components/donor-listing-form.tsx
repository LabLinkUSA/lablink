"use client";

import Image from "next/image";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Listing } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const supabase = createSupabaseBrowserClient();

type ListingFieldName =
  | "title"
  | "category"
  | "condition"
  | "quantity"
  | "location"
  | "availability_window"
  | "description"
  | "dimensions_weight"
  | "handling_requirements"
  | "working_status"
  | "documentation_included"
  | "special_handling_flags"
  | "delivery_mode"
  | "image";

type FieldErrors = Partial<Record<ListingFieldName, string>>;

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

export function DonorListingForm({
  listing,
  mode = "create",
}: {
  listing?: Listing;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function validateForm(formData: FormData): { errors: FieldErrors; quantity: number; image: File | null } {
    const errors: FieldErrors = {};

    const requireText = (key: Exclude<ListingFieldName, "quantity" | "image">, label: string) => {
      const value = formData.get(key);
      if (typeof value !== "string" || value.trim().length === 0) {
        errors[key] = `${label} is required.`;
        return "";
      }
      return value.trim();
    };

    requireText("title", "Equipment title");
    requireText("category", "Category");
    requireText("condition", "Condition");
    requireText("location", "Pickup location");
    requireText("availability_window", "Availability window");
    requireText("description", "Description");
    requireText("dimensions_weight", "Dimensions and weight");
    requireText("handling_requirements", "Handling requirements");
    requireText("working_status", "Working status");
    requireText("documentation_included", "Documentation included");
    requireText("special_handling_flags", "Special handling flags");
    requireText("delivery_mode", "Delivery mode");

    const quantityValue = formData.get("quantity");
    const quantityString = typeof quantityValue === "string" ? quantityValue.trim() : "";
    const quantity = Number(quantityString);
    if (quantityString.length === 0) {
      errors.quantity = "Quantity is required.";
    } else if (!Number.isInteger(quantity) || quantity < 1) {
      errors.quantity = "Quantity must be a whole number greater than zero.";
    }

    const imageValue = formData.get("image");
    const image = imageValue instanceof File && imageValue.size > 0 ? imageValue : null;
    const hasExistingImage = Boolean(listing?.photo_urls[0]);
    if (!image && !hasExistingImage) {
      errors.image = "Equipment image is required.";
    }

    return {
      errors,
      quantity,
      image,
    };
  }

  function getFieldClassName(name: ListingFieldName) {
    return fieldErrors[name] ? "auth-field auth-field-invalid" : "auth-field";
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const validation = validateForm(formData);

    if (Object.keys(validation.errors).length > 0) {
      setFieldErrors(validation.errors);
      setIsPending(false);
      return;
    }

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

          const quantity = validation.quantity;
          const image = validation.image;
          const photoUrls = [...(listing?.photo_urls ?? [])];

          if (image) {
            photoUrls.splice(0, photoUrls.length, await uploadListingImage(accessToken, image));
          }

          const payload = {
            title: String(formData.get("title")).trim(),
            category: String(formData.get("category")).trim(),
            condition: String(formData.get("condition")).trim(),
            quantity,
            location: String(formData.get("location")).trim(),
            availability_window: String(formData.get("availability_window")).trim(),
            description: String(formData.get("description")).trim(),
            dimensions_weight: String(formData.get("dimensions_weight")).trim(),
            handling_requirements: String(formData.get("handling_requirements")).trim(),
            working_status: String(formData.get("working_status")).trim(),
            documentation_included: String(formData.get("documentation_included")).trim(),
            special_handling_flags: String(formData.get("special_handling_flags")).trim(),
            delivery_mode: String(formData.get("delivery_mode")).trim(),
            photo_urls: photoUrls,
          };

          const response = await fetch(`${API_BASE_URL}/donor/listings${mode === "edit" && listing ? `/${listing.id}` : ""}`, {
            method: mode === "edit" ? "PATCH" : "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            let message = mode === "edit" ? "Could not update the equipment listing." : "Could not create the equipment listing.";
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
          setError(
            submitError instanceof Error
              ? submitError.message
              : mode === "edit"
                ? "Could not update the equipment listing."
                : "Could not create the equipment listing.",
          );
        })
        .finally(() => {
          setIsPending(false);
        });
    });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field-grid">
        <div className={getFieldClassName("title")}>
          <label htmlFor="title">Equipment title</label>
          <input id="title" name="title" type="text" placeholder="PCR thermal cycler" defaultValue={listing?.title ?? ""} required />
          {fieldErrors.title ? <p className="auth-field-error">{fieldErrors.title}</p> : null}
        </div>
        <div className={getFieldClassName("category")}>
          <label htmlFor="category">Category</label>
          <input id="category" name="category" type="text" placeholder="Molecular biology" defaultValue={listing?.category ?? ""} required />
          {fieldErrors.category ? <p className="auth-field-error">{fieldErrors.category}</p> : null}
        </div>
      </div>

      <div className="auth-field-grid">
        <div className={getFieldClassName("condition")}>
          <label htmlFor="condition">Condition</label>
          <input id="condition" name="condition" type="text" placeholder="Gently used" defaultValue={listing?.condition ?? ""} required />
          {fieldErrors.condition ? <p className="auth-field-error">{fieldErrors.condition}</p> : null}
        </div>
        <div className={getFieldClassName("quantity")}>
          <label htmlFor="quantity">Quantity</label>
          <input id="quantity" name="quantity" type="number" min="1" defaultValue={listing?.quantity ?? 1} required />
          {fieldErrors.quantity ? <p className="auth-field-error">{fieldErrors.quantity}</p> : null}
        </div>
      </div>

      <div className="auth-field-grid">
        <div className={getFieldClassName("location")}>
          <label htmlFor="location">Pickup location</label>
          <input id="location" name="location" type="text" placeholder="Boston, MA" defaultValue={listing?.location ?? ""} required />
          {fieldErrors.location ? <p className="auth-field-error">{fieldErrors.location}</p> : null}
        </div>
        <div className={getFieldClassName("availability_window")}>
          <label htmlFor="availability_window">Availability window</label>
          <input
            id="availability_window"
            name="availability_window"
            type="text"
            placeholder="Available through June 2026"
            defaultValue={listing?.availability_window ?? ""}
            required
          />
          {fieldErrors.availability_window ? <p className="auth-field-error">{fieldErrors.availability_window}</p> : null}
        </div>
      </div>

      <div className={getFieldClassName("description")}>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          placeholder="Share what the equipment is, its use case, and any context a recipient should know."
          defaultValue={listing?.description ?? ""}
          required
        />
        {fieldErrors.description ? <p className="auth-field-error">{fieldErrors.description}</p> : null}
      </div>

      <div className="auth-field-grid">
        <div className={getFieldClassName("dimensions_weight")}>
          <label htmlFor="dimensions_weight">Dimensions and weight</label>
          <input
            id="dimensions_weight"
            name="dimensions_weight"
            type="text"
            placeholder='24" x 18" x 16", 35 lb'
            defaultValue={listing?.dimensions_weight ?? ""}
            required
          />
          {fieldErrors.dimensions_weight ? <p className="auth-field-error">{fieldErrors.dimensions_weight}</p> : null}
        </div>
        <div className={getFieldClassName("working_status")}>
          <label htmlFor="working_status">Working status</label>
          <input
            id="working_status"
            name="working_status"
            type="text"
            placeholder="Fully operational, last serviced January 2026"
            defaultValue={listing?.working_status ?? ""}
            required
          />
          {fieldErrors.working_status ? <p className="auth-field-error">{fieldErrors.working_status}</p> : null}
        </div>
      </div>

      <div className={getFieldClassName("handling_requirements")}>
        <label htmlFor="handling_requirements">Handling requirements</label>
        <textarea
          id="handling_requirements"
          name="handling_requirements"
          placeholder="Include calibration needs, packing notes, hazardous material restrictions, or setup details."
          defaultValue={listing?.handling_requirements ?? ""}
          required
        />
        {fieldErrors.handling_requirements ? <p className="auth-field-error">{fieldErrors.handling_requirements}</p> : null}
      </div>

      <div className="auth-field-grid">
        <div className={getFieldClassName("documentation_included")}>
          <label htmlFor="documentation_included">Documentation included</label>
          <input
            id="documentation_included"
            name="documentation_included"
            type="text"
            placeholder="User manual, maintenance logs, calibration certificate"
            defaultValue={listing?.documentation_included ?? ""}
            required
          />
          {fieldErrors.documentation_included ? <p className="auth-field-error">{fieldErrors.documentation_included}</p> : null}
        </div>
        <div className={getFieldClassName("special_handling_flags")}>
          <label htmlFor="special_handling_flags">Special handling flags</label>
          <input
            id="special_handling_flags"
            name="special_handling_flags"
            type="text"
            placeholder="Fragile optics, keep upright"
            defaultValue={listing?.special_handling_flags ?? ""}
            required
          />
          {fieldErrors.special_handling_flags ? <p className="auth-field-error">{fieldErrors.special_handling_flags}</p> : null}
        </div>
      </div>

      <div className="auth-field-grid">
        <div className={getFieldClassName("delivery_mode")}>
          <label htmlFor="delivery_mode">Delivery mode</label>
          <select id="delivery_mode" name="delivery_mode" defaultValue={listing?.delivery_mode ?? "pickup_only"} required>
            <option value="pickup_only">Pickup only</option>
            <option value="pickup_or_shipment">Pickup or shipment</option>
          </select>
          {fieldErrors.delivery_mode ? <p className="auth-field-error">{fieldErrors.delivery_mode}</p> : null}
        </div>
        <div className={getFieldClassName("image")}>
          <label htmlFor="image">Equipment image</label>
          {listing?.photo_urls[0] ? (
            <div className="auth-image-preview">
              <div className="auth-image-preview-media">
                <Image
                  src={listing.photo_urls[0]}
                  alt={listing.title}
                  fill
                  sizes="160px"
                  className="listing-card-image"
                />
              </div>
              <p className="auth-image-preview-copy">Current image saved. Upload a new file only if you want to replace it.</p>
            </div>
          ) : null}
          <input id="image" name="image" type="file" accept="image/*" required={!listing?.photo_urls[0]} />
          {fieldErrors.image ? <p className="auth-field-error">{fieldErrors.image}</p> : null}
        </div>
      </div>

      {error ? <p className="auth-notice auth-notice-error">{error}</p> : null}

      <button type="submit" className="button button-primary auth-submit" disabled={isPending}>
        {isPending ? (mode === "edit" ? "Saving changes..." : "Submitting listing...") : mode === "edit" ? "Save listing changes" : "Submit for admin approval"}
      </button>
    </form>
  );
}
