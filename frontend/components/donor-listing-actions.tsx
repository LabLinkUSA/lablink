"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const supabase = createSupabaseBrowserClient();

export function DonorListingActions({
  listingId,
  status,
}: {
  listingId: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDonating, setIsDonating] = useState(false);
  const [isRemovalConfirmOpen, setIsRemovalConfirmOpen] = useState(false);

  const canManageListing = status !== "fulfilled" && status !== "removed_by_admin" && status !== "removed_by_donor";
  const canMarkAsDonated = canManageListing && status !== "draft";
  const removesDraftPermanently = status === "draft";

  async function handleMarkAsDonated() {
    const confirmed = window.confirm(
      "Mark this listing as donated? This will update the listing status to donated.",
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setIsDonating(true);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in as a donor to update a listing.");
      }

      const response = await fetch(`${API_BASE_URL}/donor/listings/${listingId}/mark-donated`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        let message = "Could not mark the equipment listing as donated.";
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) {
            message = body.detail;
          }
        } catch {}
        throw new Error(message);
      }

      router.refresh();
    } catch (donateError) {
      setError(donateError instanceof Error ? donateError.message : "Could not mark the equipment listing as donated.");
    } finally {
      setIsDonating(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setIsRemoving(true);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in as a donor to remove a listing.");
      }

      const response = await fetch(`${API_BASE_URL}/donor/listings/${listingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        let message = "Could not remove the equipment listing.";
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) {
            message = body.detail;
          }
        } catch {}
        throw new Error(message);
      }

      router.refresh();
      return true;
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove the equipment listing.");
      return false;
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="list-row-actions">
      {canManageListing ? (
        <Link href={`/donor/listings/${listingId}/edit`} className="button button-secondary">
          Edit
        </Link>
      ) : null}
      {canMarkAsDonated ? (
        <button type="button" className="button button-primary" onClick={handleMarkAsDonated} disabled={isDonating}>
          {isDonating ? "Updating..." : "Mark as donated"}
        </button>
      ) : null}
      {canManageListing ? (
        <button
          type="button"
          className="button button-danger"
          onClick={() => setIsRemovalConfirmOpen(true)}
          disabled={isRemoving}
        >
          {isRemoving ? "Removing..." : "Remove"}
        </button>
      ) : null}
      {error ? <p className="auth-notice auth-notice-error list-row-action-error">{error}</p> : null}
      {isRemovalConfirmOpen ? (
        <div className="review-modal-overlay" role="presentation" onClick={() => setIsRemovalConfirmOpen(false)}>
          <section
            className="review-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`donor-remove-${listingId}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="review-modal-confirm">
              <div>
                <h3 id={`donor-remove-${listingId}`}>
                  {removesDraftPermanently ? "Permanently delete this draft listing?" : "Are you sure you want to remove this listing?"}
                </h3>
              </div>
              <p>
                {removesDraftPermanently
                  ? "This draft listing will be permanently deleted, including its uploaded image and compliance PDF records."
                  : "This will remove the listing from donor and public availability. The listing record will still remain in the system."}
              </p>
              <div className="page-actions" style={{ marginTop: 0 }}>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setIsRemovalConfirmOpen(false)}
                  disabled={isRemoving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="button button-danger"
                  onClick={() => {
                    void handleRemove().then((didSucceed) => {
                      if (didSucceed) {
                        setIsRemovalConfirmOpen(false);
                      }
                    });
                  }}
                  disabled={isRemoving}
                >
                  {isRemoving ? "Removing..." : removesDraftPermanently ? "Yes, permanently delete draft" : "Yes, remove listing"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
