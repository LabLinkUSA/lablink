import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ListingRequestButton } from "@/components/listing-request-button";
import { RecipientSaveListingButton } from "@/components/recipient-save-listing-button";
import { StatusPill } from "@/components/status-pill";
import { getCurrentProfile, getListingDetail, getRecipientRequestState, getRecipientSavedListingState } from "@/lib/api";

export default async function ListingDetailPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const [detail, profile] = await Promise.all([getListingDetail(listingId), getCurrentProfile()]);

  if (!detail) {
    notFound();
  }

  const isVerifiedRecipient =
    profile?.user.role === "recipient_institution" &&
    profile.user.account_status === "verified" &&
    profile.institution.verification_status === "verified";

  const requestHref =
    profile?.user.role === "recipient_institution" &&
    (profile.user.account_status !== "verified" || profile.institution.verification_status !== "verified")
      ? "/recipient"
      : "/auth";
  const recipientCanSave = profile?.user.role === "recipient_institution";
  const savedState = recipientCanSave ? await getRecipientSavedListingState(listingId) : null;
  const requestState = isVerifiedRecipient ? await getRecipientRequestState(listingId) : null;

  return (
    <section className="page-section">
      <div className="shell detail-grid">
        <div className="detail-image">
          {detail.listing.photo_urls[0] ? (
            <Image
              src={detail.listing.photo_urls[0]}
              alt={detail.listing.title}
              fill
              sizes="(max-width: 980px) 100vw, 50vw"
              className="listing-card-image"
            />
          ) : (
            <div className="listing-row-image-empty">No image</div>
          )}
        </div>
        <div className="detail-content">
          <div className="detail-topline">
            <div className="detail-topline-group">
              <span className="eyebrow">{detail.listing.category}</span>
              <StatusPill status={detail.listing.status} />
            </div>
            {recipientCanSave ? (
              <RecipientSaveListingButton listingId={detail.listing.id} initialSaved={savedState?.saved ?? false} />
            ) : null}
          </div>
          <h1>{detail.listing.title}</h1>
          <p>{detail.listing.description}</p>
          {profile?.user.role !== "admin" && profile?.user.role !== "donor_lab" ? (
            <div className="detail-actions">
              {isVerifiedRecipient ? (
                <ListingRequestButton listingId={detail.listing.id} initialRequested={requestState?.requested ?? false} />
              ) : (
                <Link href={requestHref} className="button button-primary">
                  Request
                </Link>
              )}
            </div>
          ) : null}

          <section className="detail-section">
            <h2>Handling and readiness</h2>
            <dl className="details-meta">
              <div>
                <dt>Location</dt>
                <dd>{detail.listing.location}</dd>
              </div>
              <div>
                <dt>Quantity</dt>
                <dd>{detail.listing.quantity}</dd>
              </div>
              <div>
                <dt>Condition</dt>
                <dd>{detail.listing.condition}</dd>
              </div>
              <div>
                <dt>Working status</dt>
                <dd>{detail.listing.working_status}</dd>
              </div>
              <div>
                <dt>Availability window</dt>
                <dd>{detail.listing.availability_window}</dd>
              </div>
              <div>
                <dt>Delivery mode</dt>
                <dd>{detail.listing.delivery_mode.replaceAll("_", " ")}</dd>
              </div>
            </dl>
          </section>

          <section className="detail-section">
            <h2>Operational notes</h2>
            <p>{detail.listing.handling_requirements}</p>
            <p>
              Supporting docs included: <strong>{detail.listing.documentation_included}</strong>
            </p>
            <p>
              Special handling flags: <strong>{detail.listing.special_handling_flags}</strong>
            </p>
          </section>
        </div>
      </div>

      <div className="shell two-column-grid" style={{ marginTop: "1.25rem" }}>
        <aside className="detail-sidebar">
          <h2>Donor institution</h2>
          <p>{detail.donor_institution.name}</p>
          <dl>
            <div>
              <dt>Verification status</dt>
              <dd>{detail.donor_institution.verification_status.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{detail.donor_institution.location}</dd>
            </div>
          </dl>
        </aside>
        <article className="callout">
          <h2>Why the request flow is structured</h2>
          <p>
            LabLink collects intended use, readiness, and logistics notes before an admin opens messaging or selects a
            recipient. That keeps allocations fair and reduces failed handoffs for fragile or specialized equipment.
          </p>
        </article>
      </div>
    </section>
  );
}
