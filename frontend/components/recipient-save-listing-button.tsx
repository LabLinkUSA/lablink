"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const supabase = createSupabaseBrowserClient();

export function RecipientSaveListingButton({
  listingId,
  initialSaved,
  variant = "icon",
}: {
  listingId: string;
  initialSaved: boolean;
  variant?: "icon" | "full";
}) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleToggleSave() {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in as a recipient institution to save listings.");
      }

      const nextSavedState = !isSaved;
      const response = await fetch(
        nextSavedState ? `${API_BASE_URL}/recipient/saved-listings` : `${API_BASE_URL}/recipient/saved-listings/${listingId}`,
        {
          method: nextSavedState ? "POST" : "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: nextSavedState ? JSON.stringify({ listing_id: listingId }) : undefined,
        },
      );

      if (!response.ok) {
        let message = "Could not update the saved listing.";
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) {
            message = body.detail;
          }
        } catch {}
        throw new Error(message);
      }

      setIsSaved(nextSavedState);
      setToast(nextSavedState ? "Listing saved" : "Listing removed from saved listings");
      window.setTimeout(() => setToast(null), 2400);
      router.refresh();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not update the saved listing.");
      window.setTimeout(() => setToast(null), 2800);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={
          variant === "full"
            ? `button button-secondary listing-save-cta${isSaved ? " listing-save-cta-saved" : ""}`
            : `save-listing-button${isSaved ? " save-listing-button-saved" : ""}`
        }
        onClick={handleToggleSave}
        aria-label={isSaved ? "Remove listing from saved items" : "Save listing"}
        aria-pressed={isSaved}
        title={isSaved ? "Saved" : "Save listing"}
        disabled={isPending}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 4.75A2.75 2.75 0 0 1 8.75 2h6.5A2.75 2.75 0 0 1 18 4.75v16.08c0 .9-1.02 1.42-1.76.9L12 18.55l-4.24 3.18A1.1 1.1 0 0 1 6 20.83z" />
        </svg>
        {variant === "full" ? (
          <span>{isSaved ? "Saved" : "Save to favorites"}</span>
        ) : null}
      </button>
      {toast ? <div className="save-listing-toast">{toast}</div> : null}
    </>
  );
}
