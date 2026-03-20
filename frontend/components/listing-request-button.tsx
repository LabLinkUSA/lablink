"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const supabase = createSupabaseBrowserClient();

export function ListingRequestButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest() {
    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in as a recipient to request equipment.");
      }

      const response = await fetch(`${API_BASE_URL}/recipient/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ listing_id: listingId }),
      });

      if (!response.ok) {
        let message = "Could not submit the equipment request.";
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) {
            message = body.detail;
          }
        } catch {}
        throw new Error(message);
      }

      router.push("/recipient");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit the equipment request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button type="button" className="button button-primary" onClick={handleRequest} disabled={isSubmitting}>
        {isSubmitting ? "Requesting..." : "Request"}
      </button>
      {error ? <p className="auth-notice auth-notice-error">{error}</p> : null}
    </>
  );
}
