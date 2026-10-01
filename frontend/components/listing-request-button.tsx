"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Notice } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const supabase = createSupabaseBrowserClient();

export function ListingRequestButton({
  listingId,
  initialRequested,
}: {
  listingId: string;
  initialRequested: boolean;
}) {
  const router = useRouter();
  const [requestState, setRequestState] = useState<"idle" | "requested">(initialRequested ? "requested" : "idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancelRequest() {
    setError(null);
    setIsCancelling(true);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in as a recipient to manage equipment requests.");
      }

      const response = await fetch(`${API_BASE_URL}/recipient/requests/${listingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        let message = "Could not cancel the equipment request.";
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) {
            message = body.detail;
          }
        } catch {}
        throw new Error(message);
      }

      setRequestState("idle");
      router.refresh();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Could not cancel the equipment request.");
    } finally {
      setIsCancelling(false);
    }
  }

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

      setRequestState("requested");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit the equipment request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <>
        {requestState === "requested" ? (
          <Button variant="ink" size="lg" disabled>
            Requested
          </Button>
        ) : (
          <Button size="lg" arrow={!isSubmitting} onClick={handleRequest} disabled={isSubmitting}>
            {isSubmitting ? "Requesting..." : "Request"}
          </Button>
        )}
        {requestState === "requested" ? (
          <Button variant="secondary" size="lg" onClick={handleCancelRequest} disabled={isCancelling}>
            {isCancelling ? "Cancelling..." : "Cancel request"}
          </Button>
        ) : null}
      </>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </>
  );
}
