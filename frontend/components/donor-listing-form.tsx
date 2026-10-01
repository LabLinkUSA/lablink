"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar, Button, ButtonLink, Eyebrow, Field, FieldGrid, Input, Modal, Notice, Select, Textarea, cx } from "@/components/ui";
import pillStyles from "@/components/ui/status-pill.module.css";
import styles from "@/components/donor-form/donor-form.module.css";
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
    expires_at: listing.expires_at ?? null,
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
    expires_at: null,
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

function getDocumentStatusTone(status: ListingDocumentTemplate["document"]["status"]) {
  if (status === "completed") {
    return pillStyles.positive;
  }
  if (status === "outdated") {
    return pillStyles.negative;
  }
  return pillStyles.pending;
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
      setSaveMessage("Creating draft…");

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
        setSaveMessage("Saving draft…");
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

  const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setUploadError("Only JPEG, PNG, and WebP images are supported.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setUploadError("Image must be smaller than 10 MB.");
      event.target.value = "";
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


  const draftStatusMessage =
    saveMessage ?? (mode === "create" && !listingId ? "Draft will start saving after your first entry." : "Draft saved.");
  const saveTone = saveState === "saving" ? pillStyles.pending : saveState === "error" ? pillStyles.negative : saveState === "saved" ? pillStyles.positive : pillStyles.neutral;

  return (
    <>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <span
              className={cx(pillStyles.pill, saveTone, saveState === "saving" && styles.saveSaving)}
              data-save-state={saveState}
              role="status"
            >
              {saveState === "saved" ? (
                <span aria-hidden="true" className={styles.saveCheck}>✓</span>
              ) : saveState === "error" ? (
                <span aria-hidden="true" className={styles.saveCheck}>!</span>
              ) : (
                <span className={cx(pillStyles.dot, styles.saveDot)} aria-hidden="true" />
              )}
              {draftStatusMessage}
            </span>
            <ButtonLink href="/donor" variant="ghost">
              Back to donor dashboard
            </ButtonLink>
          </div>
          <h1 className={styles.title}>
            {mode === "create"
              ? "Prepare the equipment listing for admin review"
              : isRejectedListing
                ? "Revise and resubmit the donor listing"
                : "Update the donor listing"}
          </h1>
          {isRejectedListing ? (
            <Notice tone="warning">
              This listing was rejected during admin review. Update the submission details below, then resubmit the same
              listing for another review pass.
            </Notice>
          ) : null}
        </header>

        <ol className={styles.progress} aria-label="Listing progress">
          {FORM_STEPS.map((step, stepIndex) => {
            const isActive = stepIndex === currentStep;
            const isComplete = stepIndex < currentStep;
            return (
              <li key={step.key} className={styles.progressItem}>
                <button
                  type="button"
                  data-step-pill
                  aria-current={isActive ? "step" : undefined}
                  className={cx(styles.pill, isComplete && styles.pillComplete, isActive && styles.pillActive)}
                  onClick={() => attemptStepChange(stepIndex)}
                >
                  <span className={styles.index} aria-hidden="true">{isComplete ? "✓" : step.number}</span>
                  <span className={styles.label}>{step.title}</span>
                </button>
                {stepIndex < FORM_STEPS.length - 1 ? (
                  <svg viewBox="0 0 120 24" preserveAspectRatio="none" className={styles.connector} aria-hidden="true">
                    <path d="M0 12 H120" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="8 8" className={styles.connectorDash} />
                  </svg>
                ) : null}
              </li>
            );
          })}
        </ol>

        <form className={styles.form} onSubmit={handleSubmit}>
          {FORM_STEPS.map((step, stepIndex) => (
            <div key={step.key} className={cx(styles.panel, stepIndex !== currentStep && styles.panelHidden)}>
              <section data-step-card className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <Eyebrow>Step 0{step.number}</Eyebrow>
                  <h2 className={styles.stepTitle}>{step.panelTitle}</h2>
                  <p className={styles.stepLead}>{step.description}</p>
                </div>

                {step.key === "details" ? (
                  <FieldGrid>
                    <Field label="Equipment title" htmlFor="listing-title" error={fieldErrors.title}>
                      <Input
                        id="listing-title"
                        value={draft.title}
                        onChange={(event) => updateDraft("title", event.target.value)}
                        placeholder="PCR machine, Leica microscope, centrifuge…"
                      />
                    </Field>
                    <Field label="Category" htmlFor="listing-category" error={fieldErrors.category}>
                      <Input
                        id="listing-category"
                        value={draft.category}
                        onChange={(event) => updateDraft("category", event.target.value)}
                        placeholder="Molecular biology, imaging, clinical diagnostics…"
                      />
                    </Field>
                    <Field label="Condition" htmlFor="listing-condition" error={fieldErrors.condition}>
                      <Input
                        id="listing-condition"
                        value={draft.condition}
                        onChange={(event) => updateDraft("condition", event.target.value)}
                        placeholder="Used, like new, needs calibration…"
                      />
                    </Field>
                    <Field label="Quantity" htmlFor="listing-quantity" error={fieldErrors.quantity}>
                      <Input
                        id="listing-quantity"
                        type="number"
                        min={1}
                        step={1}
                        value={draft.quantity}
                        onChange={(event) => updateDraft("quantity", Number(event.target.value || 0))}
                        placeholder="1"
                      />
                    </Field>
                    <Field label="Availability window" htmlFor="listing-window" error={fieldErrors.availability_window}>
                      <Input
                        id="listing-window"
                        value={draft.availability_window}
                        onChange={(event) => updateDraft("availability_window", event.target.value)}
                        placeholder="Available now, pickup by May 15, end of semester…"
                      />
                    </Field>
                    <Field label="Expiration date (optional)" htmlFor="listing-expires-at">
                      <Input
                        id="listing-expires-at"
                        type="date"
                        value={draft.expires_at ? draft.expires_at.slice(0, 10) : ""}
                        onChange={(event) => updateDraft("expires_at", event.target.value ? event.target.value : null)}
                      />
                    </Field>
                    <Field label="Working status" htmlFor="listing-working-status" error={fieldErrors.working_status}>
                      <Input
                        id="listing-working-status"
                        value={draft.working_status}
                        onChange={(event) => updateDraft("working_status", event.target.value)}
                        placeholder="Fully functional, powers on but untested, for parts…"
                      />
                    </Field>
                    <Field label="Description" htmlFor="listing-description" error={fieldErrors.description} span="full">
                      <Textarea
                        id="listing-description"
                        rows={6}
                        value={draft.description}
                        onChange={(event) => updateDraft("description", event.target.value)}
                        placeholder="Include manufacturer, model number, age, known issues, included accessories, and anything a recipient should know before requesting it."
                      />
                    </Field>
                  </FieldGrid>
                ) : null}

                {step.key === "visuals" ? (
                  <div className={styles.stack}>
                    <label className={styles.upload} htmlFor="listing-image">
                      <Avatar initials="+" variant="ink" size="lg" />
                      <div className={styles.uploadCopy}>
                        <strong>Upload listing image</strong>
                        <p>Use a clear photo that shows the equipment condition and any included accessories.</p>
                        <p className={styles.uploadFile}>
                          {isUploadingImage
                            ? "Uploading image…"
                            : selectedImageName
                              ? `Selected file: ${selectedImageName}`
                              : "PNG, JPG, and other standard image formats are supported."}
                        </p>
                      </div>
                      <input id="listing-image" className="sr-only" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleImageSelected} />
                    </label>
                    {fieldErrors.photo_urls ? <Notice tone="error">{fieldErrors.photo_urls}</Notice> : null}
                    {uploadError ? <Notice tone="error">{uploadError}</Notice> : null}
                    {draft.photo_urls[0] ? (
                      <div className={styles.preview}>
                        <Image src={draft.photo_urls[0]} alt={draft.title || "Draft listing image"} fill sizes="(max-width: 980px) 100vw, 520px" className={styles.previewImage} />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {step.key === "logistics" ? (
                  <div className={styles.stack}>
                    <div className={styles.note}>
                      <span className={styles.noteIcon} aria-hidden="true">i</span>
                      <div>Include anything the admin reviewer or recipient institution would need to know about pickup, moving constraints, or documentation that travels with the equipment.</div>
                    </div>
                    <FieldGrid>
                      <Field label="Pickup location" htmlFor="listing-location" error={fieldErrors.location}>
                        <Input
                          id="listing-location"
                          value={draft.location}
                          onChange={(event) => updateDraft("location", event.target.value)}
                          placeholder="Yale School of Medicine, New Haven, CT"
                        />
                      </Field>
                      <Field label="Delivery mode" htmlFor="listing-delivery-mode" error={fieldErrors.delivery_mode}>
                        <Select id="listing-delivery-mode" value={draft.delivery_mode} onChange={(event) => updateDraft("delivery_mode", event.target.value)}>
                          <option value="pickup_only">Pickup only</option>
                          <option value="shipment_possible">Shipment possible</option>
                        </Select>
                      </Field>
                      <Field label="Dimensions and weight" htmlFor="listing-dimensions" error={fieldErrors.dimensions_weight}>
                        <Input
                          id="listing-dimensions"
                          value={draft.dimensions_weight}
                          onChange={(event) => updateDraft("dimensions_weight", event.target.value)}
                          placeholder='24" x 18" x 20", approximately 45 lbs'
                        />
                      </Field>
                      <Field label="Handling requirements" htmlFor="listing-handling" error={fieldErrors.handling_requirements}>
                        <Input
                          id="listing-handling"
                          value={draft.handling_requirements}
                          onChange={(event) => updateDraft("handling_requirements", event.target.value)}
                          placeholder="Two-person lift, keep upright, cold storage needed…"
                        />
                      </Field>
                      <Field label="Documentation included" htmlFor="listing-docs" error={fieldErrors.documentation_included}>
                        <Input
                          id="listing-docs"
                          value={draft.documentation_included}
                          onChange={(event) => updateDraft("documentation_included", event.target.value)}
                          placeholder="User manual, maintenance log, calibration records…"
                        />
                      </Field>
                      <Field label="Special handling flags" htmlFor="listing-special-flags" error={fieldErrors.special_handling_flags} span="full">
                        <Textarea
                          id="listing-special-flags"
                          rows={4}
                          value={draft.special_handling_flags}
                          onChange={(event) => updateDraft("special_handling_flags", event.target.value)}
                          placeholder="List decontamination status, missing parts, biohazard clearance, export restrictions, or any other special review notes."
                        />
                      </Field>
                    </FieldGrid>
                  </div>
                ) : null}

                {step.key === "compliance" ? (
                  <>
                    {complianceReady ? (
                      <div className={styles.complianceStack}>
                        {templates.map((template) => (
                          <article
                            key={template.form_type}
                            className={cx("donor-compliance-card", styles.complianceCard, template.document.status === "completed" && "donor-compliance-card-complete", template.document.status === "completed" && styles.complianceComplete)}
                          >
                            <div className={styles.complianceRow}>
                              <div className={styles.complianceHead}>
                                <h3>{template.title}</h3>
                                <span className={cx(pillStyles.pill, getDocumentStatusTone(template.document.status))}>
                                  <span className={pillStyles.dot} aria-hidden="true" />
                                  {getDocumentStatusLabel(template.document.status)}
                                </span>
                              </div>
                              <Button variant="secondary" onClick={() => openDocumentModal(template)}>
                                {template.document.status === "not_started" ? "Open PDF form" : "Replace PDF"}
                              </Button>
                            </div>

                            <div className={styles.docMeta}>
                              {template.document.completed_by_name ? (
                                <span>
                                  Completed by {template.document.completed_by_name}
                                  {template.document.completed_at ? ` on ${new Date(template.document.completed_at).toLocaleDateString()}` : ""}
                                </span>
                              ) : null}
                              {template.document.preview_url ? (
                                <ButtonLink href={template.document.preview_url} target="_blank" rel="noreferrer" variant="ghost" size="sm">
                                  Preview PDF
                                </ButtonLink>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <Notice tone="info">
                        Start the form by filling out at least one field. LabLink will create the draft first, then load the compliance PDFs here.
                      </Notice>
                    )}
                  </>
                ) : null}
              </section>

            </div>
          ))}
          {formError ? <Notice tone="error">{formError}</Notice> : null}
          {submitError ? <Notice tone="error">{submitError}</Notice> : null}
          <div className={styles.actionBar}>
            <p className={styles.actionNote}>
              {mode === "create" && !listingId
                ? "The listing stays private until you submit it. LabLink will start the draft after your first entry."
                : "The listing stays private until you submit it. Draft changes save automatically while you work."}
            </p>
            <div className={styles.actionButtons}>
              {currentStep > 0 ? (
                <Button variant="secondary" className="donor-form-secondary-action" onClick={() => attemptStepChange(currentStep - 1)}>
                  Back
                </Button>
              ) : null}
              {currentStep < FORM_STEPS.length - 1 ? (
                <Button arrow className="donor-form-primary-action" onClick={() => attemptStepChange(currentStep + 1)}>
                  Continue
                </Button>
              ) : (
                <Button type="submit" arrow className="donor-form-primary-action" disabled={!canSubmit}>
                  {isSubmitting ? "Submitting…" : isRejectedListing ? "Resubmit for admin review" : "Submit for admin review"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      <Modal
        open={Boolean(activeTemplate)}
        dismissible={!isSavingDocument}
        onClose={closeDocumentModal}
        eyebrow="Compliance PDF"
        title={activeTemplate?.title ?? "Compliance PDF"}
        wide
      >
        {activeTemplate ? (
          <div className={styles.modalLayout}>
            <div className={styles.modalCopy}>
              <iframe title={`${activeTemplate.title} blank template`} src={activeTemplate.blank_pdf_url} className={styles.iframe} />
              <div className={styles.linkRow}>
                <ButtonLink href={activeTemplate.blank_pdf_url} target="_blank" rel="noreferrer" variant="secondary" size="sm">
                  Open in new tab
                </ButtonLink>
                <ButtonLink href={activeTemplate.blank_pdf_url} download variant="secondary" size="sm">
                  Download blank PDF
                </ButtonLink>
              </div>
              {activeTemplate.document.preview_url ? (
                <div className={styles.savedBlock}>
                  <Eyebrow>Current saved PDF</Eyebrow>
                  <iframe title={`${activeTemplate.title} saved copy`} src={activeTemplate.document.preview_url} className={cx(styles.iframe, styles.iframeSaved)} />
                </div>
              ) : null}
            </div>

            <div className={styles.modalForm}>
              <div className={styles.uploadPanel}>
                <strong>Upload completed PDF</strong>
                <p>Choose the edited PDF you just saved from your PDF viewer. LabLink will validate the required fields and store that exact file.</p>
                <input ref={pdfUploadInputRef} type="file" accept="application/pdf,.pdf" onChange={handleCompletedPdfSelected} />
                <p className={styles.uploadFile}>
                  {isSavingDocument ? "Validating and saving uploaded PDF…" : selectedPdfName ? `Selected file: ${selectedPdfName}` : "Only completed PDF files are accepted."}
                </p>
              </div>

              {activeTemplate.document.completed_by_name ? (
                <Notice tone="success">
                  Current saved PDF: {activeTemplate.document.file_name ?? "completed form.pdf"}
                </Notice>
              ) : null}

              <div className={styles.modalActions}>
                <Button variant="secondary" onClick={closeDocumentModal} disabled={isSavingDocument}>
                  Cancel
                </Button>
                <Button
                  onClick={closeDocumentModal}
                  disabled={isSavingDocument || (!hasUploadedCurrentPdf && activeTemplate.document.status !== "completed")}
                >
                  Done
                </Button>
              </div>
              {documentError ? <Notice tone="error">{documentError}</Notice> : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
