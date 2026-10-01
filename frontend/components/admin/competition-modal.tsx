"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Modal, Notice } from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ListingDetailResponse } from "@/lib/types";

import styles from "./admin.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const supabase = createSupabaseBrowserClient();

export function RequestCompetitionModal({
  listingId,
  onClose,
}: {
  listingId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<ListingDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw new Error(sessionError.message);
        }

        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("You must be signed in as an admin to review recipient selection.");
        }

        const response = await fetch(`${API_BASE_URL}/admin/listings/${listingId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          let message = "Could not load the recipient selection view.";
          try {
            const body = (await response.json()) as { detail?: string };
            if (body.detail) {
              message = body.detail;
            }
          } catch {}
          throw new Error(message);
        }

        const nextDetail = (await response.json()) as ListingDetailResponse;
        setDetail(nextDetail);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load the recipient selection view.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [listingId]);

  async function handleSelectRecipient(requestId: string) {
    setSelectedRequestId(requestId);
    setError(null);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in as an admin to select a recipient.");
      }

      const response = await fetch(`${API_BASE_URL}/admin/requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status: "approved_matched",
        }),
      });

      if (!response.ok) {
        let message = "Could not update the request status.";
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) {
            message = body.detail;
          }
        } catch {}
        throw new Error(message);
      }

      router.refresh();
      onClose();
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : "Could not update the request status.");
    } finally {
      setSelectedRequestId(null);
    }
  }

  async function handleCancelMatch() {
    setIsCancelling(true);
    setError(null);

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("You must be signed in as an admin to cancel the match.");
      }

      const response = await fetch(`${API_BASE_URL}/admin/listings/${listingId}/cancel-match`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        let message = "Could not cancel the current match.";
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) {
            message = body.detail;
          }
        } catch {}
        throw new Error(message);
      }

      router.refresh();
      onClose();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Could not cancel the current match.");
    } finally {
      setIsCancelling(false);
    }
  }

  const hasMatchedRequest = Boolean(detail?.related_requests.some((request) => request.status === "approved_matched"));

  return (
    <Modal
      open
      onClose={onClose}
      wide
      eyebrow="Recipient selection"
      title={detail?.listing.title ?? "Loading listing..."}
      footer={
        hasMatchedRequest ? (
          <Button variant="danger" onClick={handleCancelMatch} disabled={isCancelling}>
            {isCancelling ? "Cancelling..." : "Cancel match"}
          </Button>
        ) : undefined
      }
    >
      <div className={styles.stack}>
        {isLoading ? <Notice tone="info">Loading recipient selection...</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}

        {detail ? (
          <div className={styles.requestList}>
            {detail.related_requests.map((request) => (
              <article key={request.id} className={styles.requestCard}>
                <div className={styles.requestTop}>
                  <span className={styles.requestProgram}>{request.program_or_department}</span>
                  <StatusPill status={request.status} />
                </div>
                <h3 className={styles.requestUse}>{request.intended_use}</h3>
                <p className={styles.bodyText}>{request.storage_readiness}</p>
                <div className={styles.requestMeta}>
                  <span>{request.audience}</span>
                  <span>{request.delivery_constraints}</span>
                </div>
                <div className={styles.formActions}>
                  <Button
                    size="sm"
                    onClick={() => handleSelectRecipient(request.id)}
                    disabled={selectedRequestId === request.id}
                  >
                    {selectedRequestId === request.id ? "Selecting..." : "Select recipient"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
