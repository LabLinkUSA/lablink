"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createListingFromBoardPost, getDonorRequestBoard } from "@/lib/api-client";
import { StatusPill } from "@/components/status-pill";
import { Button, Card, EmptyState, Eyebrow, Notice } from "@/components/ui";
import type { RequestBoardPost } from "@/lib/types";

import styles from "./request-board-browser.module.css";

function formatNeededBy(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

function BoardPostCard({
  post,
  onRespond,
  isResponding,
}: {
  post: RequestBoardPost;
  onRespond: (postId: string) => void;
  isResponding: boolean;
}) {
  return (
    <Card as="article" interactive data-board-card className={styles.card}>
      <div className={styles.cardHeader}>
        <Eyebrow>{post.category}</Eyebrow>
        <StatusPill status={post.status} />
      </div>
      <h2 className={styles.title}>{post.title}</h2>

      <p className={styles.description}>{truncate(post.description, 200)}</p>

      <dl className={styles.meta}>
        {post.location ? (
          <div>
            <dt>Location</dt>
            <dd>{post.location}</dd>
          </div>
        ) : null}
        {post.quantity_needed ? (
          <div>
            <dt>Quantity needed</dt>
            <dd>{post.quantity_needed}</dd>
          </div>
        ) : null}
        {post.needed_by ? (
          <div>
            <dt>Needed by</dt>
            <dd>{formatNeededBy(post.needed_by)}</dd>
          </div>
        ) : null}
      </dl>

      <div className={styles.actions}>
        <Button arrow onClick={() => onRespond(post.id)} disabled={isResponding || post.status !== "open"}>
          {isResponding ? "Creating listing…" : "Respond with Listing"}
        </Button>
      </div>
    </Card>
  );
}

export function RequestBoardBrowser() {
  const router = useRouter();
  const [posts, setPosts] = useState<RequestBoardPost[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingPostId, setRespondingPostId] = useState<string | null>(null);
  const [respondError, setRespondError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const result = await getDonorRequestBoard();
      setPosts(result ?? []);
      setIsLoading(false);
    })();
  }, []);

  async function handleRespond(postId: string) {
    setRespondingPostId(postId);
    setRespondError(null);

    const listing = await createListingFromBoardPost(postId);

    if (!listing) {
      setRespondError("Could not create a listing for this request. Please try again.");
      setRespondingPostId(null);
      return;
    }

    router.push(`/donor/listings/${listing.id}/edit`);
  }

  if (isLoading) {
    return (
      <div className={styles.grid} role="status" aria-label="Loading request board">
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skeleton} aria-hidden="true" />
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div data-board-empty>
        <EmptyState
          variant="empty"
          eyebrow="No posts yet"
          title="No open recipient requests are on the board right now."
          lead="Check back soon."
        />
      </div>
    );
  }

  return (
    <div>
      {respondError ? <Notice tone="error">{respondError}</Notice> : null}
      <div className={styles.grid}>
        {posts.map((post) => (
          <BoardPostCard
            key={post.id}
            post={post}
            onRespond={handleRespond}
            isResponding={respondingPostId === post.id}
          />
        ))}
      </div>
    </div>
  );
}
