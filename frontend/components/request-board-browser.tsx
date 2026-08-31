"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createListingFromBoardPost, getDonorRequestBoard } from "@/lib/api";
import type { RequestBoardPost } from "@/lib/types";

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
    <article className="board-post-card">
      <div className="board-post-card-header">
        <div>
          <span className="eyebrow">{post.category}</span>
          <h2 className="board-post-card-title">{post.title}</h2>
        </div>
        <span className={`status-pill status-pill-${post.status}`}>{post.status.replace("_", " ")}</span>
      </div>

      <p className="board-post-card-description">{truncate(post.description, 200)}</p>

      <dl className="board-post-card-meta">
        {post.location ? (
          <>
            <dt>Location</dt>
            <dd>{post.location}</dd>
          </>
        ) : null}
        {post.quantity_needed ? (
          <>
            <dt>Quantity needed</dt>
            <dd>{post.quantity_needed}</dd>
          </>
        ) : null}
        {post.needed_by ? (
          <>
            <dt>Needed by</dt>
            <dd>{formatNeededBy(post.needed_by)}</dd>
          </>
        ) : null}
      </dl>

      <div className="board-post-card-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={() => onRespond(post.id)}
          disabled={isResponding || post.status !== "open"}
        >
          {isResponding ? "Creating listing…" : "Respond with Listing"}
        </button>
      </div>
    </article>
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
      <div className="ops-empty-state">
        <p>Loading request board…</p>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="ops-empty-state">
        <span className="eyebrow">No posts yet</span>
        <p>No open recipient requests are on the board right now. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="request-board-browser">
      {respondError ? (
        <p className="auth-notice auth-notice-error">{respondError}</p>
      ) : null}
      <div className="board-post-list">
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
