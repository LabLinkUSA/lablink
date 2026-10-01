"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/donor-dashboard.module.css";
import { Button, ButtonLink, Modal, Notice } from "@/components/ui";
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
  const [isRemovalConfirmOpen, setIsRemovalConfirmOpen] = useState(false);

  const canManageListing = status !== "fulfilled" && status !== "removed_by_admin" && status !== "removed_by_donor";
  const isRejectedListing = status === "rejected";
  const removesDraftPermanently = status === "draft";

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
    <div className={styles.actions}>
      {canManageListing ? (
        <ButtonLink
          href={`/donor/listings/${listingId}/edit`}
          variant="secondary"
          size="sm"
          title={
            status === "live"
              ? "Editing key fields (title, condition, quantity, etc.) may return this listing to admin review."
              : undefined
          }
        >
          {isRejectedListing ? "Edit / Resubmit" : "Edit"}
        </ButtonLink>
      ) : null}
      {canManageListing ? (
        <Button variant="danger" size="sm" onClick={() => setIsRemovalConfirmOpen(true)} disabled={isRemoving}>
          {isRemoving ? "Removing..." : "Remove"}
        </Button>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Modal
        open={isRemovalConfirmOpen}
        onClose={() => setIsRemovalConfirmOpen(false)}
        title={removesDraftPermanently ? "Permanently delete this draft listing?" : "Are you sure you want to remove this listing?"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRemovalConfirmOpen(false)} disabled={isRemoving}>
              Cancel
            </Button>
            <Button
              variant="danger"
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
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>
          {removesDraftPermanently
            ? "This draft listing will be permanently deleted, including its uploaded image and compliance PDF records."
            : "This will remove the listing from donor and public availability. The listing record will still remain in the system."}
        </p>
      </Modal>
    </div>
  );
}
