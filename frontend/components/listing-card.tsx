import Image from "next/image";
import Link from "next/link";

import { formatDate } from "@/lib/format";
import type { Listing } from "@/lib/types";
import { StatusPill } from "@/components/status-pill";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <article className="listing-card">
      <div className="listing-card-media">
        {listing.photo_urls[0] ? (
          <Image
            src={listing.photo_urls[0]}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="listing-card-image"
          />
        ) : (
          <div className="listing-row-image-empty">No image</div>
        )}
      </div>
      <div className="listing-card-body">
        <div className="listing-card-topline">
          <span>{listing.category}</span>
          <StatusPill status={listing.status} />
        </div>
        <h3>{listing.title}</h3>
        <p>{listing.description}</p>
        <dl className="meta-grid">
          <div>
            <dt>Location</dt>
            <dd>{listing.location}</dd>
          </div>
          <div>
            <dt>Quantity</dt>
            <dd>{listing.quantity}</dd>
          </div>
          <div>
            <dt>Condition</dt>
            <dd>{listing.condition}</dd>
          </div>
          <div>
            <dt>Posted</dt>
            <dd>{formatDate(listing.created_at)}</dd>
          </div>
        </dl>
        <div className="listing-card-footer">
          <span>{listing.request_count} active request(s)</span>
          <Link href={`/listings/${listing.id}`} className="button button-secondary">
            View Listing
          </Link>
        </div>
      </div>
    </article>
  );
}
