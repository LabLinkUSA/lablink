import Image from "next/image";

import { StatusPill } from "@/components/status-pill";
import type { Listing } from "@/lib/types";

export function ListingListRow({
  listing,
  status,
  description,
  meta,
  actions,
  asButton = false,
  onClick,
}: {
  listing: Listing;
  status?: string;
  description: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  asButton?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="listing-row-media">
        {listing.photo_urls[0] ? (
          <Image
            src={listing.photo_urls[0]}
            alt={listing.title}
            fill
            sizes="120px"
            className="listing-card-image"
          />
        ) : (
          <div className="listing-row-image-empty">No image</div>
        )}
      </div>
      <div className="listing-row-content">
        <div className="list-row-topline">
          <strong>{listing.category}</strong>
          <StatusPill status={status ?? listing.status} />
        </div>
        <h3>{listing.title}</h3>
        <p>{description}</p>
        {meta}
        {actions}
      </div>
    </>
  );

  if (asButton) {
    return (
      <button type="button" className="list-row listing-row review-trigger" onClick={onClick}>
        {content}
      </button>
    );
  }

  return <article className="list-row listing-row">{content}</article>;
}
