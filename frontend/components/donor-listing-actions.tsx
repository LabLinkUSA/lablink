"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const supabase = createSupabaseBrowserClient();

export function DonorListingActions({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleRemove() {
    const confirmed = window.confirm(
      "Remove this listing? It will be taken out of donor and public availability.",
    );
    if (!confirmed) {
      return;
    }

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
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove the equipment listing.");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="list-row-actions">
      <Link href={`/donor/listings/${listingId}/edit`} className="button button-secondary">
        Edit
      </Link>
      <button type="button" className="button button-outline" onClick={handleRemove} disabled={isRemoving}>
        {isRemoving ? "Removing..." : "Remove"}
      </button>
      {error ? <p className="auth-notice auth-notice-error list-row-action-error">{error}</p> : null}
    </div>
  );
}
