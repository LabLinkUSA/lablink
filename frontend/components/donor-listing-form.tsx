"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  Listing,
  ListingDocumentFormType,
  ListingDocumentSaveResponse,
  ListingDocumentTemplate,
  ListingDraftSaveInput,
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const supabase = createSupabaseBrowserClient();

type ListingFieldName = keyof ListingDraftSaveInput;
type ListingFieldErrors = Partial<Record<ListingFieldName, string>>;

const FORM_STEPS = [
  {
    key: "details",
    number: 1,
    title: "Equipment Details",
    panelTitle: "Step 1: Equipment Details",
    description: "Capture the core equipment details that admins will review before the listing goes live.",
    fields: ["title", "category", "condition", "quantity", "availability_window", "working_status", "description"] as ListingFieldName[],
  },
  {
    key: "visuals",
    number: 2,
    title: "Visual Documentation",
    panelTitle: "Step 2: Visual Documentation",
    description: "Upload at least one image so the admin team can verify the equipment condition and packaging state.",
    fields: ["photo_urls"] as ListingFieldName[],
  },
  {
    key: "logistics",
    number: 3,
    title: "Logistics",
    panelTitle: "Step 3: Logistics & Pickup",
    description: "Record the handling, location, and documentation details required for transfer planning.",
    fields: [
      "location",
      "dimensions_weight",
      "handling_requirements",
      "documentation_included",
      "special_handling_flags",
      "delivery_mode",
    ] as ListingFieldName[],
  },
  {
    key: "compliance",
    number: 4,
    title: "Compliance PDFs",
    panelTitle: "Step 4: Compliance PDFs",
    description: "Open the real fillable PDF, complete it in your PDF viewer, and upload the finished file back to LabLink.",
    fields: [] as ListingFieldName[],
  },
] as const;

function buildInitialDraft(listing: Listing): ListingDraftSaveInput {
  return {
    title: listing.title,
    category: listing.category,
    condition: listing.condition,
    quantity: listing.quantity,
    location: listing.location,
    availability_window: listing.availability_window,
    description: listing.description,
    dimensions_weight: listing.dimensions_weight,
    handling_requirements: listing.handling_requirements,
    working_status: listing.working_status,
    documentation_included: listing.documentation_included,
    special_handling_flags: listing.special_handling_flags,
    delivery_mode: listing.delivery_mode,
    photo_urls: listing.photo_urls,
  };
}

function createEmptyDraft(): ListingDraftSaveInput {
  return {
    title: "",
    category: "",
    condition: "",
    quantity: 1,
    location: "",
    availability_window: "",
    description: "",
    dimensions_weight: "",
    handling_requirements: "",
    working_status: "",
    documentation_included: "",
    special_handling_flags: "",
    delivery_mode: "pickup_only",
    photo_urls: [],
  };
}

function serializeDraft(payload: ListingDraftSaveInput) {
  return JSON.stringify(payload);
}

function hasMeaningfulDraftContent(payload: ListingDraftSaveInput) {
  const emptyDraft = createEmptyDraft();
  return (
    payload.title.trim().length > 0 ||
    payload.category.trim().length > 0 ||
    payload.condition.trim().length > 0 ||
    payload.location.trim().length > 0 ||
    payload.availability_window.trim().length > 0 ||
    payload.description.trim().length > 0 ||
    payload.dimensions_weight.trim().length > 0 ||
    payload.handling_requirements.trim().length > 0 ||
    payload.working_status.trim().length > 0 ||
    payload.documentation_included.trim().length > 0 ||
    payload.special_handling_flags.trim().length > 0 ||
    payload.quantity !== emptyDraft.quantity ||
    payload.delivery_mode !== emptyDraft.delivery_mode ||
    payload.photo_urls.length > 0
  );
}

function validateListingFieldState(payload: ListingDraftSaveInput): ListingFieldErrors {
  const errors: ListingFieldErrors = {};
  const requiredTextFields: Array<[ListingFieldName, string]> = [
    ["title", "Equipment title"],
    ["category", "Category"],
    ["condition", "Condition"],
    ["location", "Pickup location"],
    ["availability_window", "Availability window"],
    ["description", "Description"],
    ["dimensions_weight", "Dimensions and weight"],
    ["handling_requirements", "Handling requirements"],
    ["working_status", "Working status"],
    ["documentation_included", "Documentation included"],
    ["special_handling_flags", "Special handling flags"],
    ["delivery_mode", "Delivery mode"],
  ];

  for (const [key, label] of requiredTextFields) {
    if (typeof payload[key] !== "string" || payload[key].trim().length === 0) {
      errors[key] = `${label} is required.`;
    }
  }

  if (!Number.isInteger(payload.quantity) || payload.quantity < 1) {
    errors.quantity = "Quantity must be a whole number greater than zero.";
  }

  if (!payload.photo_urls.length) {
    errors.photo_urls = "An equipment image is required.";
  }

  return errors;
}

function getDocumentStatusLabel(status: ListingDocumentTemplate["document"]["status"]) {
  if (status === "completed") {
    return "Completed";
  }
  if (status === "outdated") {
    return "Outdated";
  }
  return "Required";
}

function getDocumentStatusClass(status: ListingDocumentTemplate["document"]["status"]) {
  if (status === "completed") {
    return "donor-document-status donor-document-status-complete";
  }
  if (status === "outdated") {
    return "donor-document-status donor-document-status-outdated";
  }
  return "donor-document-status donor-document-status-pending";
}

export function DonorListingForm({
  listing,
  documentTemplates,
  mode = "create",
}: {
  listing: Listing;
  documentTemplates: ListingDocumentTemplate[];
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<ListingDraftSaveInput>(() => buildInitialDraft(listing));
  const [fieldErrors, setFieldErrors] = useState<ListingFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ListingDocumentTemplate[]>(documentTemplates);
  const [activeTemplateKey, setActiveTemplateKey] = useState<ListingDocumentFormType | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const [selectedPdfName, setSelectedPdfName] = useState<string | null>(null);
  const [hasUploadedCurrentPdf, setHasUploadedCurrentPdf] = useState(false);
  const [listingId, setListingId] = useState<string | null>(listing.id || null);

  const saveTimeoutRef = useRef<number | null>(null);
  const pendingSaveRef = useRef<{ payload: ListingDraftSaveInput; snapshot: string } | null>(null);
  const lastSavedSnapshotRef = useRef(serializeDraft(buildInitialDraft(listing)));
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const pdfUploadInputRef = useRef<HTMLInputElement | null>(null);
  const createDraftPromiseRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    setTemplates(documentTemplates);
  }, [documentTemplates]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const activeTemplate = useMemo(
    () => templates.find((template) => template.form_type === activeTemplateKey) ?? null,
    [activeTemplateKey, templates],
  );
  const isRejectedListing = listing.status === "rejected";

  const listingErrors = useMemo(() => validateListingFieldState(draft), [draft]);
  const complianceReady = Boolean(listingId) && templates.length > 0;
  const documentsComplete = complianceReady && templates.every((template) => template.document.status === "completed");
  const canSubmit = Object.keys(listingErrors).length === 0 && documentsComplete && !isUploadingImage && !isSubmitting;
  const progress = ((currentStep + 1) / FORM_STEPS.length) * 100;

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(error.message);
    }
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      throw new Error("You must be signed in as a donor to manage this listing.");
    }
    return accessToken;
  }

  async function loadDocumentTemplates(nextListingId: string) {
    const accessToken = await getAccessToken();
    const response = await fetch(`${API_BASE_URL}/donor/listings/${nextListingId}/form-templates`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Could not load the compliance PDF templates for this draft.");
    }

    const body = (await response.json()) as { templates: ListingDocumentTemplate[] };
    setTemplates(body.templates);
  }

  async function ensureDraftExists() {
    if (listingId) {
      return listingId;
    }

    if (createDraftPromiseRef.current) {
      return createDraftPromiseRef.current;
    }

    createDraftPromiseRef.current = (async () => {
      setSaveState("saving");
      setSaveMessage("Creating draft...");

      try {
        const accessToken = await getAccessToken();
        const response = await fetch(`${API_BASE_URL}/donor/listings/drafts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          let message = "Could not start the draft listing.";
          try {
            const body = (await response.json()) as { detail?: string };
            if (body.detail) {
              message = body.detail;
            }
          } catch {}
          throw new Error(message);
        }

        const createdListing = (await response.json()) as Listing;
        setListingId(createdListing.id);
        try {
          await loadDocumentTemplates(createdListing.id);
          setDocumentError(null);
        } catch (error) {
          setDocumentError(
            error instanceof Error ? error.message : "Could not load the compliance PDF templates for this draft.",
          );
        }
        window.history.replaceState({}, "", `/donor/list-equipment?draft=${createdListing.id}`);
        return createdListing.id;
      } catch (error) {
        setSaveState("error");
        setSaveMessage(error instanceof Error ? error.message : "Could not start the draft listing.");
        return null;
      } finally {
        createDraftPromiseRef.current = null;
      }
    })();

    return createDraftPromiseRef.current;
  }

  async function persistDraft(payload: ListingDraftSaveInput, snapshot: string) {
    try {
      const resolvedListingId = await ensureDraftExists();
      if (!resolvedListingId) {
        throw new Error("Could not start the draft listing.");
      }

      const accessToken = await getAccessToken();
      const response = await fetch(`${API_BASE_URL}/donor/listings/${resolvedListingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = "Could not save the draft listing.";
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) {
            message = body.detail;
          }
        } catch {}
        throw new Error(message);
      }

      lastSavedSnapshotRef.current = snapshot;
      setSaveState("saved");
      setSaveMessage("Draft saved.");
      return true;
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "Could not save the draft listing.");
      return false;
    }
  }

  async function flushPendingSaves() {
    if (savePromiseRef.current) {
      return savePromiseRef.current;
    }

    savePromiseRef.current = (async () => {
      let didSucceed = true;
      while (pendingSaveRef.current) {
        const nextSave = pendingSaveRef.current;
        pendingSaveRef.current = null;
        setSaveState("saving");
        setSaveMessage("Saving draft...");
        const currentResult = await persistDraft(nextSave.payload, nextSave.snapshot);
        didSucceed = didSucceed && currentResult;
      }
      savePromiseRef.current = null;
      return didSucceed;
    })();

    return savePromiseRef.current;
  }

  function scheduleDraftSave(nextPayload: ListingDraftSaveInput) {
    const snapshot = serializeDraft(nextPayload);
    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    if (!hasMeaningfulDraftContent(nextPayload)) {
      pendingSaveRef.current = null;
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      setSaveState("idle");
      setSaveMessage(mode === "create" && !listingId ? "Draft will start saving after your first entry." : "Draft saved.");
      return;
    }

    pendingSaveRef.current = { payload: nextPayload, snapshot };
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      void flushPendingSaves();
    }, 700);
  }

  useEffect(() => {
    scheduleDraftSave(draft);
  }, [draft]);

  function updateDraft<K extends ListingFieldName>(key: K, value: ListingDraftSaveInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }
      const nextErrors = { ...current };
      delete nextErrors[key];
      return nextErrors;
    });
    setFormError(null);
    setSubmitError(null);
  }

  function getStepErrors(stepIndex: number) {
    if (stepIndex === 3) {
      return {};
    }
    const stepFields = new Set(FORM_STEPS[stepIndex].fields);
    return Object.fromEntries(Object.entries(listingErrors).filter(([field]) => stepFields.has(field as ListingFieldName)));
  }

  function attemptStepChange(nextStep: number) {
    if (nextStep < currentStep) {
      setCurrentStep(nextStep);
      setFormError(null);
      return;
    }

    if (currentStep === 3 && !documentsComplete) {
      setFormError("Complete both compliance PDFs before submitting the listing.");
      return;
    }

    const stepErrors = getStepErrors(currentStep);
    if (Object.keys(stepErrors).length > 0) {
      setFieldErrors(stepErrors);
      setFormError("Complete all required fields in this section before continuing.");
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setCurrentStep(nextStep);
  }

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSelectedImageName(file.name);
    setUploadError(null);
    setIsUploadingImage(true);

    try {
      const accessToken = await getAccessToken();
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
      updateDraft("photo_urls", [body.photo_url]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not upload the listing image.");
    } finally {
      setIsUploadingImage(false);
      event.target.value = "";
    }
  }

  function openDocumentModal(template: ListingDocumentTemplate) {
    setActiveTemplateKey(template.form_type);
    setDocumentError(null);
    setSelectedPdfName(null);
    setHasUploadedCurrentPdf(false);
  }

  function closeDocumentModal() {
    if (isSavingDocument) {
      return;
    }
    setActiveTemplateKey(null);
    setDocumentError(null);
    setSelectedPdfName(null);
    setHasUploadedCurrentPdf(false);
  }

  async function handleCompletedPdfSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !activeTemplate || !listingId) {
      return;
    }

    setSelectedPdfName(file.name);
    setDocumentError(null);
    setIsSavingDocument(true);

    try {
      const accessToken = await getAccessToken();
      const formData = new FormData();
      formData.append("template_version", activeTemplate.template_version);
      formData.append("original_filename", file.name);
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/donor/listings/${listingId}/documents/${activeTemplate.form_type}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let message = "Could not save the completed PDF.";
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) {
            message = body.detail;
          }
        } catch {}
        throw new Error(message);
      }

      const body = (await response.json()) as ListingDocumentSaveResponse;
      setTemplates((current) =>
        current.map((template) =>
          template.form_type === activeTemplate.form_type ? { ...template, document: body.document } : template,
        ),
      );
      setHasUploadedCurrentPdf(true);
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : "Could not save the completed PDF.");
      setHasUploadedCurrentPdf(false);
    } finally {
      setIsSavingDocument(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setFormError(null);

    const nextErrors = validateListingFieldState(draft);
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidStep = FORM_STEPS.findIndex((step) => step.fields.some((field) => field in nextErrors));
      setFieldErrors(nextErrors);
      setCurrentStep(firstInvalidStep === -1 ? 0 : firstInvalidStep);
      setSubmitError("Complete all required listing fields before submitting.");
      return;
    }

    if (!documentsComplete) {
      setCurrentStep(3);
      setSubmitError("Complete both compliance PDFs before submitting the listing.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      pendingSaveRef.current = { payload: draft, snapshot: serializeDraft(draft) };
      const didSave = await flushPendingSaves();
      if (!didSave) {
        throw new Error("LabLink could not save the latest draft changes before submission.");
      }

      if (!listingId) {
        throw new Error("Start the listing by filling out at least one field before submitting.");
      }

      const accessToken = await getAccessToken();
      const response = await fetch(`${API_BASE_URL}/donor/listings/${listingId}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        let message = "Could not submit the listing for admin review.";
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
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not submit the listing for admin review.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function getFieldClassName(name: ListingFieldName) {
    return fieldErrors[name] ? "auth-field auth-field-invalid" : "auth-field";
  }

  return (
    <>
      <div className="donor-form-shell">
        <header className="donor-form-header">
          <div className="donor-form-header-topbar">
            <span className={`donor-draft-status donor-draft-status-${saveState}`}>
              <span aria-hidden="true">{saveState === "error" ? "!" : "✓"}</span>
              {saveMessage ?? (mode === "create" && !listingId ? "Draft will start saving after your first entry." : "Draft saved.")}
            </span>
          </div>
          <div className="donor-form-header-row">
            <h1>
              {mode === "create"
                ? "Prepare the equipment listing for admin review"
                : isRejectedListing
                  ? "Revise and resubmit the donor listing"
                  : "Update the donor listing"}
            </h1>
            <Link href="/donor" className="button button-primary donor-header-link">
              Back to donor dashboard
            </Link>
          </div>
          {isRejectedListing ? (
            <p className="listing-detail-note">
              This listing was rejected during admin review. Update the submission details below, then resubmit the same
              listing for another review pass.
            </p>
          ) : null}
        </header>

        <div className="donor-form-progress" aria-label="Listing progress">
          <div className="donor-form-progress-steps">
            {FORM_STEPS.map((step, stepIndex) => {
              const isActive = stepIndex === currentStep;
              const isComplete = stepIndex < currentStep;
              return (
                <button
                  key={step.key}
                  type="button"
                  className={`donor-form-progress-step ${isComplete ? "donor-form-progress-step-complete" : ""} ${isActive ? "donor-form-progress-step-active" : ""}`}
                  onClick={() => attemptStepChange(stepIndex)}
                >
                  <span className="donor-form-progress-index">{step.number}</span>
                  <span className="donor-form-progress-label">{step.title}</span>
                </button>
              );
            })}
          </div>
          <div className="donor-form-progress-track" aria-hidden="true">
            <div className="donor-form-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <form className="donor-form" onSubmit={handleSubmit}>
          {FORM_STEPS.map((step, stepIndex) => (
            <section
              key={step.key}
              className={`donor-form-step-panel ${stepIndex === currentStep ? "" : "donor-form-step-panel-hidden"}`}
            >
              <div className="donor-form-step-header">
                <span className="donor-form-step-icon">0{step.number}</span>
                <div>
                  <h2>{step.panelTitle}</h2>
                  <p>{step.description}</p>
                </div>
              </div>

              {step.key === "details" ? (
                <div className="auth-field-grid">
                  <div className={getFieldClassName("title")}>
                    <label htmlFor="listing-title">Equipment title</label>
                    <input
                      id="listing-title"
                      value={draft.title}
                      onChange={(event) => updateDraft("title", event.target.value)}
                      placeholder="PCR machine, Leica microscope, centrifuge..."
                    />
                    {fieldErrors.title ? <span className="auth-field-error">{fieldErrors.title}</span> : null}
                  </div>
                  <div className={getFieldClassName("category")}>
                    <label htmlFor="listing-category">Category</label>
                    <input
                      id="listing-category"
                      value={draft.category}
                      onChange={(event) => updateDraft("category", event.target.value)}
                      placeholder="Molecular biology, imaging, clinical diagnostics..."
                    />
                    {fieldErrors.category ? <span className="auth-field-error">{fieldErrors.category}</span> : null}
                  </div>
                  <div className={getFieldClassName("condition")}>
                    <label htmlFor="listing-condition">Condition</label>
                    <input
                      id="listing-condition"
                      value={draft.condition}
                      onChange={(event) => updateDraft("condition", event.target.value)}
                      placeholder="Used, like new, needs calibration..."
                    />
                    {fieldErrors.condition ? <span className="auth-field-error">{fieldErrors.condition}</span> : null}
                  </div>
                  <div className={getFieldClassName("quantity")}>
                    <label htmlFor="listing-quantity">Quantity</label>
                    <input
                      id="listing-quantity"
                      type="number"
                      min={1}
                      step={1}
                      value={draft.quantity}
                      onChange={(event) => updateDraft("quantity", Number(event.target.value || 0))}
                      placeholder="1"
                    />
                    {fieldErrors.quantity ? <span className="auth-field-error">{fieldErrors.quantity}</span> : null}
                  </div>
                  <div className={getFieldClassName("availability_window")}>
                    <label htmlFor="listing-window">Availability window</label>
                    <input
                      id="listing-window"
                      value={draft.availability_window}
                      onChange={(event) => updateDraft("availability_window", event.target.value)}
                      placeholder="Available now, pickup by May 15, end of semester..."
                    />
                    {fieldErrors.availability_window ? <span className="auth-field-error">{fieldErrors.availability_window}</span> : null}
                  </div>
                  <div className={getFieldClassName("working_status")}>
                    <label htmlFor="listing-working-status">Working status</label>
                    <input
                      id="listing-working-status"
                      value={draft.working_status}
                      onChange={(event) => updateDraft("working_status", event.target.value)}
                      placeholder="Fully functional, powers on but untested, for parts..."
                    />
                    {fieldErrors.working_status ? <span className="auth-field-error">{fieldErrors.working_status}</span> : null}
                  </div>
                  <div className={`${getFieldClassName("description")} auth-field-span-full`}>
                    <label htmlFor="listing-description">Description</label>
                    <textarea
                      id="listing-description"
                      rows={6}
                      value={draft.description}
                      onChange={(event) => updateDraft("description", event.target.value)}
                      placeholder="Include manufacturer, model number, age, known issues, included accessories, and anything a recipient should know before requesting it."
                    />
                    {fieldErrors.description ? <span className="auth-field-error">{fieldErrors.description}</span> : null}
                  </div>
                </div>
              ) : null}

              {step.key === "visuals" ? (
                <div className="donor-form-upload-block">
                  <label className="donor-form-upload" htmlFor="listing-image">
                    <div className="donor-form-upload-copy">
                      <strong>Upload listing image</strong>
                      <p>Use a clear photo that shows the equipment condition and any included accessories.</p>
                    </div>
                    <input id="listing-image" type="file" accept="image/*" onChange={handleImageSelected} />
                    <p className="donor-form-upload-file">
                      {isUploadingImage
                        ? "Uploading image..."
                        : selectedImageName
                          ? `Selected file: ${selectedImageName}`
                          : "PNG, JPG, and other standard image formats are supported."}
                    </p>
                  </label>
                  {fieldErrors.photo_urls ? <span className="auth-field-error">{fieldErrors.photo_urls}</span> : null}
                  {uploadError ? <p className="auth-notice auth-notice-error">{uploadError}</p> : null}
                  {draft.photo_urls[0] ? (
                    <div className="donor-form-preview">
                      <div className="review-modal-image donor-form-preview-frame">
                        <Image src={draft.photo_urls[0]} alt={draft.title || "Draft listing image"} fill sizes="(max-width: 980px) 100vw, 50vw" className="listing-card-image" />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {step.key === "logistics" ? (
                <>
                  <div className="donor-form-logistics-note">
                    <span aria-hidden="true">i</span>
                    <div>Include anything the admin reviewer or recipient institution would need to know about pickup, moving constraints, or documentation that travels with the equipment.</div>
                  </div>
                  <div className="auth-field-grid">
                    <div className={getFieldClassName("location")}>
                      <label htmlFor="listing-location">Pickup location</label>
                      <input
                        id="listing-location"
                        value={draft.location}
                        onChange={(event) => updateDraft("location", event.target.value)}
                        placeholder="Yale School of Medicine, New Haven, CT"
                      />
                      {fieldErrors.location ? <span className="auth-field-error">{fieldErrors.location}</span> : null}
                    </div>
                    <div className={getFieldClassName("delivery_mode")}>
                      <label htmlFor="listing-delivery-mode">Delivery mode</label>
                      <select id="listing-delivery-mode" value={draft.delivery_mode} onChange={(event) => updateDraft("delivery_mode", event.target.value)}>
                        <option value="pickup_only">Pickup only</option>
                        <option value="shipment_possible">Shipment possible</option>
                      </select>
                      {fieldErrors.delivery_mode ? <span className="auth-field-error">{fieldErrors.delivery_mode}</span> : null}
                    </div>
                    <div className={getFieldClassName("dimensions_weight")}>
                      <label htmlFor="listing-dimensions">Dimensions and weight</label>
                      <input
                        id="listing-dimensions"
                        value={draft.dimensions_weight}
                        onChange={(event) => updateDraft("dimensions_weight", event.target.value)}
                        placeholder='24" x 18" x 20", approximately 45 lbs'
                      />
                      {fieldErrors.dimensions_weight ? <span className="auth-field-error">{fieldErrors.dimensions_weight}</span> : null}
                    </div>
                    <div className={getFieldClassName("handling_requirements")}>
                      <label htmlFor="listing-handling">Handling requirements</label>
                      <input
                        id="listing-handling"
                        value={draft.handling_requirements}
                        onChange={(event) => updateDraft("handling_requirements", event.target.value)}
                        placeholder="Two-person lift, keep upright, cold storage needed..."
                      />
                      {fieldErrors.handling_requirements ? <span className="auth-field-error">{fieldErrors.handling_requirements}</span> : null}
                    </div>
                    <div className={getFieldClassName("documentation_included")}>
                      <label htmlFor="listing-docs">Documentation included</label>
                      <input
                        id="listing-docs"
                        value={draft.documentation_included}
                        onChange={(event) => updateDraft("documentation_included", event.target.value)}
                        placeholder="User manual, maintenance log, calibration records..."
                      />
                      {fieldErrors.documentation_included ? <span className="auth-field-error">{fieldErrors.documentation_included}</span> : null}
                    </div>
                    <div className={`${getFieldClassName("special_handling_flags")} auth-field-span-full`}>
                      <label htmlFor="listing-special-flags">Special handling flags</label>
                      <textarea
                        id="listing-special-flags"
                        rows={4}
                        value={draft.special_handling_flags}
                        onChange={(event) => updateDraft("special_handling_flags", event.target.value)}
                        placeholder="List decontamination status, missing parts, biohazard clearance, export restrictions, or any other special review notes."
                      />
                      {fieldErrors.special_handling_flags ? <span className="auth-field-error">{fieldErrors.special_handling_flags}</span> : null}
                    </div>
                  </div>
                </>
              ) : null}

              {step.key === "compliance" ? (
                <>
                  {complianceReady ? (
                    <div className="donor-compliance-stack">
                      {templates.map((template) => (
                        <article
                          key={template.form_type}
                          className={`donor-compliance-card ${template.document.status === "completed" ? "donor-compliance-card-complete" : "donor-compliance-card-invalid"}`}
                        >
                          <div className="donor-compliance-card-row">
                            <div className="donor-compliance-card-header">
                              <h3>{template.title}</h3>
                              <span className={getDocumentStatusClass(template.document.status)}>{getDocumentStatusLabel(template.document.status)}</span>
                            </div>
                            <button type="button" className="button button-secondary" onClick={() => openDocumentModal(template)}>
                              {template.document.status === "not_started" ? "Open PDF form" : "Replace PDF"}
                            </button>
                          </div>

                          <div className="donor-document-meta">
                            {template.document.completed_by_name ? (
                              <span>
                                Completed by {template.document.completed_by_name}
                                {template.document.completed_at ? ` on ${new Date(template.document.completed_at).toLocaleDateString()}` : ""}
                              </span>
                            ) : null}
                            {template.document.preview_url ? (
                              <a href={template.document.preview_url} target="_blank" rel="noreferrer" className="button button-outline donor-document-preview-link">
                                Preview PDF
                              </a>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="auth-notice">
                      Start the form by filling out at least one field. LabLink will create the draft first, then load the compliance PDFs here.
                    </div>
                  )}
                </>
              ) : null}

              <div className="donor-form-actions">
                <span className="donor-form-actions-note">
                  {mode === "create" && !listingId
                    ? "The listing stays private until you submit it. LabLink will start the draft after your first entry."
                    : "The listing stays private until you submit it. Draft changes save automatically while you work."}
                </span>
                <div className="donor-form-actions-buttons">
                  {currentStep > 0 ? (
                    <button type="button" className="button button-outline donor-form-secondary-action" onClick={() => attemptStepChange(currentStep - 1)}>
                      Back
                    </button>
                  ) : null}
                  {currentStep < FORM_STEPS.length - 1 ? (
                    <button type="button" className="button button-primary donor-form-primary-action" onClick={() => attemptStepChange(currentStep + 1)}>
                      Continue
                    </button>
                  ) : (
                    <button type="submit" className="button button-primary donor-form-primary-action" disabled={!canSubmit}>
                      {isSubmitting ? "Submitting..." : isRejectedListing ? "Resubmit for admin review" : "Submit for admin review"}
                    </button>
                  )}
                </div>
                {formError ? <p className="auth-notice auth-notice-error">{formError}</p> : null}
                {submitError ? <p className="auth-notice auth-notice-error">{submitError}</p> : null}
              </div>
            </section>
          ))}
        </form>
      </div>

      {activeTemplate ? (
        <div className="review-modal-overlay" role="presentation" onClick={closeDocumentModal}>
          <section className="review-modal-card review-modal-card-wide donor-document-modal" role="dialog" aria-modal="true" aria-labelledby={`document-modal-${activeTemplate.form_type}`} onClick={(event) => event.stopPropagation()}>
            <div className="review-modal-header">
              <div>
                <span className="eyebrow">Compliance PDF</span>
                <h2 id={`document-modal-${activeTemplate.form_type}`}>{activeTemplate.title}</h2>
              </div>
              <button type="button" className="button button-outline" onClick={closeDocumentModal}>
                Close
              </button>
            </div>

            <div className="donor-document-modal-layout">
              <div className="donor-document-modal-copy">
                <iframe title={`${activeTemplate.title} blank template`} src={activeTemplate.blank_pdf_url} className="donor-document-preview" />
                <div className="donor-document-link-row">
                  <a className="button button-outline" href={activeTemplate.blank_pdf_url} target="_blank" rel="noreferrer">
                    Open in new tab
                  </a>
                  <a className="button button-outline" href={activeTemplate.blank_pdf_url} download>
                    Download blank PDF
                  </a>
                </div>
                {activeTemplate.document.preview_url ? (
                  <div className="donor-document-preview-shell">
                    <span className="eyebrow eyebrow-subtle">Current saved PDF</span>
                    <iframe title={`${activeTemplate.title} saved copy`} src={activeTemplate.document.preview_url} className="donor-document-preview donor-document-preview-saved" />
                  </div>
                ) : null}
              </div>

              <div className="donor-document-modal-form">
                <div className="donor-document-upload-panel">
                  <strong>Upload completed PDF</strong>
                  <p>Choose the edited PDF you just saved from your PDF viewer. LabLink will validate the required fields and store that exact file.</p>
                  <input ref={pdfUploadInputRef} type="file" accept="application/pdf,.pdf" onChange={handleCompletedPdfSelected} />
                  <p className="donor-form-upload-file">
                    {isSavingDocument ? "Validating and saving uploaded PDF..." : selectedPdfName ? `Selected file: ${selectedPdfName}` : "Only completed PDF files are accepted."}
                  </p>
                </div>

                {activeTemplate.document.completed_by_name ? (
                  <div className="donor-document-upload-success">
                    Current saved PDF: {activeTemplate.document.file_name ?? "completed form.pdf"}
                  </div>
                ) : null}

                <div className="donor-document-modal-actions">
                  <button type="button" className="button button-outline" onClick={closeDocumentModal} disabled={isSavingDocument}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={closeDocumentModal}
                    disabled={isSavingDocument || (!hasUploadedCurrentPdf && activeTemplate.document.status !== "completed")}
                  >
                    Done
                  </button>
                </div>
                {documentError ? <p className="auth-notice auth-notice-error">{documentError}</p> : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
