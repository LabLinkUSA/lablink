"use client";

import Image from "next/image";
import { startTransition, useRef, useState } from "react";
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

const FORM_STEPS = [
  {
    key: "details",
    number: 1,
    title: "Equipment Details",
    panelTitle: "Step 1: Equipment Details",
    description: "Tell us about the technical specifications of your donation.",
    fields: ["title", "category", "condition", "quantity", "availability_window", "working_status", "description"] as ListingFieldName[],
  },
  {
    key: "visuals",
    number: 2,
    title: "Visual Assets",
    panelTitle: "Step 2: Visual Documentation",
    description: "High-quality photos increase the speed of verification.",
    fields: ["image"] as ListingFieldName[],
  },
  {
    key: "logistics",
    number: 3,
    title: "Logistics",
    panelTitle: "Step 3: Logistics & Pickup",
    description: "Share the handling and delivery constraints for this equipment.",
    fields: [
      "location",
      "dimensions_weight",
      "handling_requirements",
      "documentation_included",
      "special_handling_flags",
      "delivery_mode",
    ] as ListingFieldName[],
  },
] as const;

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
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);

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

  function getStepErrors(errors: FieldErrors, stepIndex: number): FieldErrors {
    const stepFields = new Set(FORM_STEPS[stepIndex].fields);
    return Object.fromEntries(Object.entries(errors).filter(([key]) => stepFields.has(key as ListingFieldName)));
  }

  function validateStep(formData: FormData, stepIndex: number): FieldErrors {
    const errors: FieldErrors = {};

    const requireText = (key: Exclude<ListingFieldName, "quantity" | "image">, label: string) => {
      const value = formData.get(key);
      if (typeof value !== "string" || value.trim().length === 0) {
        errors[key] = `${label} is required.`;
      }
    };

    if (stepIndex === 0) {
      requireText("title", "Equipment title");
      requireText("category", "Category");
      requireText("condition", "Condition");
      requireText("availability_window", "Availability window");
      requireText("working_status", "Working status");
      requireText("description", "Description");

      const quantityValue = formData.get("quantity");
      const quantityString = typeof quantityValue === "string" ? quantityValue.trim() : "";
      const quantity = Number(quantityString);
      if (quantityString.length === 0) {
        errors.quantity = "Quantity is required.";
      } else if (!Number.isInteger(quantity) || quantity < 1) {
        errors.quantity = "Quantity must be a whole number greater than zero.";
      }
    }

    if (stepIndex === 1) {
      const imageValue = formData.get("image");
      const image = imageValue instanceof File && imageValue.size > 0 ? imageValue : null;
      const hasExistingImage = Boolean(listing?.photo_urls[0]);
      if (!image && !hasExistingImage) {
        errors.image = "Equipment image is required.";
      }
    }

    if (stepIndex === 2) {
      requireText("location", "Pickup location");
      requireText("dimensions_weight", "Dimensions and weight");
      requireText("handling_requirements", "Handling requirements");
      requireText("documentation_included", "Documentation included");
      requireText("special_handling_flags", "Special handling flags");
      requireText("delivery_mode", "Delivery mode");
    }

    return errors;
  }

  function getFirstInvalidStep(errors: FieldErrors): number {
    const invalidFieldNames = new Set(Object.keys(errors));
    const invalidStepIndex = FORM_STEPS.findIndex((step) => step.fields.some((field) => invalidFieldNames.has(field)));
    return invalidStepIndex === -1 ? 0 : invalidStepIndex;
  }

  function getFieldClassName(name: ListingFieldName) {
    return fieldErrors[name] ? "auth-field auth-field-invalid" : "auth-field";
  }

  function attemptStepChange(nextStep: number) {
    if (nextStep < currentStep) {
      setError(null);
      setFieldErrors({});
      setCurrentStep(nextStep);
      return;
    }

    const form = formRef.current;
    if (!form) {
      return;
    }

    const stepErrors = validateStep(new FormData(form), currentStep);

    if (Object.keys(stepErrors).length > 0) {
      setFieldErrors(stepErrors);
      setError("Complete all required fields in this section before continuing.");
      return;
    }

    setError(null);
    setFieldErrors({});
    setCurrentStep(nextStep);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (currentStep < FORM_STEPS.length - 1) {
      return;
    }

    setError(null);
    setFieldErrors({});
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const validation = validateForm(formData);

    if (Object.keys(validation.errors).length > 0) {
      const firstInvalidStep = getFirstInvalidStep(validation.errors);
      setCurrentStep(firstInvalidStep);
      setFieldErrors(getStepErrors(validation.errors, firstInvalidStep));
      setError("Complete all required fields before submitting this listing.");
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

  const progressPercent = `${((currentStep + 1) / FORM_STEPS.length) * 100}%`;
  const pageTitle = mode === "edit" ? "Edit Laboratory Equipment" : "Donate Laboratory Equipment";
  const pageDescription =
    mode === "edit"
      ? "Update the equipment record below and keep the submission aligned with your current donor inventory."
      : "Your contribution extends the life of clinical technology. Complete the following steps to list your item for renewal.";
  const submitLabel =
    mode === "edit" ? (isPending ? "Saving changes..." : "Save listing changes") : isPending ? "Submitting listing..." : "Confirm Donation";

  function handleFinalSubmit() {
    formRef.current?.requestSubmit();
  }

  return (
    <div className="donor-form-shell">
      <header className="donor-form-header">
        <h1>{pageTitle}</h1>
        <p>{pageDescription}</p>
      </header>

      <div className="donor-form-progress">
        <div className="donor-form-progress-steps" aria-label="Donation form progress">
          {FORM_STEPS.map((step, index) => {
            const state = index === currentStep ? "active" : index < currentStep ? "complete" : "inactive";

            return (
              <div key={step.key} className={`donor-form-progress-step donor-form-progress-step-${state}`}>
                <span className="donor-form-progress-index">{step.number}</span>
                <span className="donor-form-progress-label">{step.title}</span>
              </div>
            );
          })}
        </div>
        <div className="donor-form-progress-track" aria-hidden="true">
          <div className="donor-form-progress-fill" style={{ width: progressPercent }} />
        </div>
      </div>

      <form ref={formRef} className="auth-form donor-form" onSubmit={handleSubmit} noValidate>
        <section className={`donor-form-step-panel${currentStep === 0 ? "" : " donor-form-step-panel-hidden"}`}>
          <div className="donor-form-step-header">
            <div className="donor-form-step-icon">01</div>
            <div>
              <h2>{FORM_STEPS[0].panelTitle}</h2>
              <p>{FORM_STEPS[0].description}</p>
            </div>
          </div>

          <div className="auth-field-grid">
            <div className={getFieldClassName("title")}>
              <label htmlFor="title">Equipment title</label>
              <input id="title" name="title" type="text" placeholder="PCR thermal cycler" defaultValue={listing?.title ?? ""} />
              {fieldErrors.title ? <p className="auth-field-error">{fieldErrors.title}</p> : null}
            </div>
            <div className={getFieldClassName("category")}>
              <label htmlFor="category">Category</label>
              <input id="category" name="category" type="text" placeholder="Molecular biology" defaultValue={listing?.category ?? ""} />
              {fieldErrors.category ? <p className="auth-field-error">{fieldErrors.category}</p> : null}
            </div>
          </div>

          <div className="auth-field-grid">
            <div className={getFieldClassName("condition")}>
              <label htmlFor="condition">Condition</label>
              <input id="condition" name="condition" type="text" placeholder="Gently used" defaultValue={listing?.condition ?? ""} />
              {fieldErrors.condition ? <p className="auth-field-error">{fieldErrors.condition}</p> : null}
            </div>
            <div className={getFieldClassName("quantity")}>
              <label htmlFor="quantity">Quantity</label>
              <input id="quantity" name="quantity" type="number" min="1" defaultValue={listing?.quantity ?? 1} />
              {fieldErrors.quantity ? <p className="auth-field-error">{fieldErrors.quantity}</p> : null}
            </div>
          </div>

          <div className="auth-field-grid">
            <div className={getFieldClassName("availability_window")}>
              <label htmlFor="availability_window">Availability window</label>
              <input
                id="availability_window"
                name="availability_window"
                type="text"
                placeholder="Available through June 2026"
                defaultValue={listing?.availability_window ?? ""}
              />
              {fieldErrors.availability_window ? <p className="auth-field-error">{fieldErrors.availability_window}</p> : null}
            </div>
            <div className={getFieldClassName("working_status")}>
              <label htmlFor="working_status">Working status</label>
              <input
                id="working_status"
                name="working_status"
                type="text"
                placeholder="Fully operational, last serviced January 2026"
                defaultValue={listing?.working_status ?? ""}
              />
              {fieldErrors.working_status ? <p className="auth-field-error">{fieldErrors.working_status}</p> : null}
            </div>
          </div>

          <div className={getFieldClassName("description")}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Share what the equipment is, its use case, and any context a recipient should know."
              defaultValue={listing?.description ?? ""}
            />
            {fieldErrors.description ? <p className="auth-field-error">{fieldErrors.description}</p> : null}
          </div>
        </section>

        <section className={`donor-form-step-panel${currentStep === 1 ? "" : " donor-form-step-panel-hidden"}`}>
          <div className="donor-form-step-header">
            <div className="donor-form-step-icon">02</div>
            <div>
              <h2>{FORM_STEPS[1].panelTitle}</h2>
              <p>{FORM_STEPS[1].description}</p>
            </div>
          </div>

          <div className={getFieldClassName("image")}>
            <label htmlFor="image">Equipment image</label>
            <div className="donor-form-upload">
              <div className="donor-form-upload-copy">
                <strong>Upload a clear equipment photo</strong>
                <p>JPG, PNG, or WEBP. A single primary image is enough for LabLink review.</p>
              </div>
              <input
                id="image"
                name="image"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setSelectedImageName(file ? file.name : null);
                }}
              />
            </div>
            {listing?.photo_urls[0] ? (
              <div className="auth-image-preview donor-form-preview">
                <div className="auth-image-preview-media">
                  <Image
                    src={listing.photo_urls[0]}
                    alt={listing.title}
                    fill
                    sizes="160px"
                    className="listing-card-image"
                  />
                </div>
                <p className="auth-image-preview-copy">
                  {selectedImageName
                    ? `Selected replacement image: ${selectedImageName}`
                    : "Current image saved. Upload a new file only if you want to replace it."}
                </p>
              </div>
            ) : selectedImageName ? (
              <p className="donor-form-upload-file">Selected file: {selectedImageName}</p>
            ) : null}
            {fieldErrors.image ? <p className="auth-field-error">{fieldErrors.image}</p> : null}
          </div>
        </section>

        <section className={`donor-form-step-panel${currentStep === 2 ? "" : " donor-form-step-panel-hidden"}`}>
          <div className="donor-form-step-header">
            <div className="donor-form-step-icon">03</div>
            <div>
              <h2>{FORM_STEPS[2].panelTitle}</h2>
              <p>{FORM_STEPS[2].description}</p>
            </div>
          </div>

          <div className="auth-field-grid">
            <div className={getFieldClassName("location")}>
              <label htmlFor="location">Pickup location</label>
              <input id="location" name="location" type="text" placeholder="Boston, MA" defaultValue={listing?.location ?? ""} />
              {fieldErrors.location ? <p className="auth-field-error">{fieldErrors.location}</p> : null}
            </div>
            <div className={getFieldClassName("delivery_mode")}>
              <label htmlFor="delivery_mode">Delivery mode</label>
              <select id="delivery_mode" name="delivery_mode" defaultValue={listing?.delivery_mode ?? "pickup_only"}>
                <option value="pickup_only">Pickup only</option>
                <option value="pickup_or_shipment">Pickup or shipment</option>
              </select>
              {fieldErrors.delivery_mode ? <p className="auth-field-error">{fieldErrors.delivery_mode}</p> : null}
            </div>
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
              />
              {fieldErrors.dimensions_weight ? <p className="auth-field-error">{fieldErrors.dimensions_weight}</p> : null}
            </div>
            <div className={getFieldClassName("documentation_included")}>
              <label htmlFor="documentation_included">Documentation included</label>
              <input
                id="documentation_included"
                name="documentation_included"
                type="text"
                placeholder="User manual, maintenance logs, calibration certificate"
                defaultValue={listing?.documentation_included ?? ""}
              />
              {fieldErrors.documentation_included ? <p className="auth-field-error">{fieldErrors.documentation_included}</p> : null}
            </div>
          </div>

          <div className={getFieldClassName("handling_requirements")}>
            <label htmlFor="handling_requirements">Handling requirements</label>
            <textarea
              id="handling_requirements"
              name="handling_requirements"
              placeholder="Include calibration needs, packing notes, hazardous material restrictions, or setup details."
              defaultValue={listing?.handling_requirements ?? ""}
            />
            {fieldErrors.handling_requirements ? <p className="auth-field-error">{fieldErrors.handling_requirements}</p> : null}
          </div>

          <div className={getFieldClassName("special_handling_flags")}>
            <label htmlFor="special_handling_flags">Special handling flags</label>
            <input
              id="special_handling_flags"
              name="special_handling_flags"
              type="text"
              placeholder="Fragile optics, keep upright"
              defaultValue={listing?.special_handling_flags ?? ""}
            />
            {fieldErrors.special_handling_flags ? <p className="auth-field-error">{fieldErrors.special_handling_flags}</p> : null}
          </div>

          <div className="donor-form-logistics-note">
            <strong>Logistics Note:</strong> Include enough detail for LabLink admins to coordinate packing and pickup without follow-up.
          </div>
        </section>

        {error ? <p className="auth-notice auth-notice-error">{error}</p> : null}

        <footer className="donor-form-actions">
          <div className="donor-form-actions-note">By submitting, you agree to the Renewal Terms.</div>
          <div className="donor-form-actions-buttons">
            {currentStep > 0 ? (
              <button
                type="button"
                className="button button-outline donor-form-secondary-action"
                onClick={() => attemptStepChange(currentStep - 1)}
                disabled={isPending}
              >
                Previous
              </button>
            ) : null}

            {currentStep < FORM_STEPS.length - 1 ? (
              <button
                key={`next-step-${currentStep}`}
                type="button"
                className="button button-primary donor-form-primary-action"
                onClick={() => attemptStepChange(currentStep + 1)}
                disabled={isPending}
              >
                Next
              </button>
            ) : (
              <button
                key="final-submit"
                type="button"
                className="button button-primary donor-form-primary-action"
                onClick={handleFinalSubmit}
                disabled={isPending}
              >
                {submitLabel}
              </button>
            )}
          </div>
        </footer>
      </form>
    </div>
  );
}
