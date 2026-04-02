import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ListingRequestButton } from "@/components/listing-request-button";
import { RecipientSaveListingButton } from "@/components/recipient-save-listing-button";
import { StatusPill } from "@/components/status-pill";
import { isApprovedRecipient } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { getCurrentProfile, getListingDetail, getRecipientRequestState, getRecipientSavedListingState } from "@/lib/api";

function humanize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

const MATCHED_RECIPIENT_STATUSES = new Set(["approved_matched", "completed"]);

export default async function ListingDetailPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const [detail, profile] = await Promise.all([getListingDetail(listingId), getCurrentProfile()]);

  if (!detail) {
    notFound();
  }

  const isListingRequestable = detail.listing.status === "live";
  const isMatchedReserved = detail.listing.status === "matched_reserved";
  const isVerifiedRecipient = isApprovedRecipient(profile);
  const isNonApprovedRecipient = profile?.user.role === "recipient_institution" && !isVerifiedRecipient;
  const requestHref = isNonApprovedRecipient ? "/recipient" : "/auth";
  const recipientCanSave = isVerifiedRecipient && (isListingRequestable || isMatchedReserved);
  const showRequestAction = profile?.user.role !== "admin" && profile?.user.role !== "donor_lab";
  const savedState = recipientCanSave ? await getRecipientSavedListingState(listingId) : null;
  const requestState = isVerifiedRecipient && (isListingRequestable || isMatchedReserved) ? await getRecipientRequestState(listingId) : null;
  const isMatchedRecipient =
    isMatchedReserved && requestState?.status ? MATCHED_RECIPIENT_STATUSES.has(requestState.status) : false;
  const deliveryMode = humanize(detail.listing.delivery_mode);
  const donorVerification = humanize(detail.donor_institution.verification_status);
  const donorInitials = getInitials(detail.donor_institution.name);
  const dimensionsWeight = detail.listing.dimensions_weight.trim();
  const documentationIncluded = detail.listing.documentation_included.trim() || "Not specified";
  const handlingRequirements =
    detail.listing.handling_requirements.trim() || "No special handling requirements were provided.";
  const specialHandlingFlags = detail.listing.special_handling_flags.trim() || "None noted";
  const coreFacts = [
    { label: "Category", value: detail.listing.category },
    { label: "Condition", value: detail.listing.condition },
    { label: "Working status", value: detail.listing.working_status },
    { label: "Location", value: detail.listing.location },
    { label: "Quantity", value: `${detail.listing.quantity}` },
    ...(dimensionsWeight ? [{ label: "Dimensions / weight", value: dimensionsWeight }] : []),
  ];

  return (
    <section className="page-section listing-detail-page">
      <div className="shell">
        <nav className="listing-detail-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/listings">Equipment</Link>
          <span aria-hidden="true">/</span>
          <span>{detail.listing.category}</span>
          <span aria-hidden="true">/</span>
          <span>{detail.listing.title}</span>
        </nav>

        <div className="listing-detail-layout">
          <div className="listing-detail-media-frame">
            <div className="listing-detail-media">
              {detail.listing.photo_urls[0] ? (
                <Image
                  src={detail.listing.photo_urls[0]}
                  alt={detail.listing.title}
                  fill
                  sizes="(max-width: 1100px) 100vw, 58vw"
                  className="listing-card-image"
                />
              ) : (
                <div className="listing-row-image-empty">No image</div>
              )}
              <div className="listing-detail-floating-badges">
                <span className="listing-detail-badge listing-detail-badge-secondary">
                  {detail.donor_institution.verification_status === "verified" ? "Verified donor" : donorVerification}
                </span>
              </div>
            </div>
          </div>

          <div className="listing-detail-hero-content">
            <section className="listing-detail-heading">
              <div className="listing-detail-status-row">
                <StatusPill status={detail.listing.status} />
                <span className="eyebrow">{detail.listing.category}</span>
              </div>
              <h1>{detail.listing.title}</h1>
              <div className="listing-detail-donor-row">
                <div className="listing-detail-donor-avatar" aria-hidden="true">
                  {donorInitials}
                </div>
                <div>
                  <span>Donated by</span>
                  <strong>{detail.donor_institution.name}</strong>
                </div>
              </div>
              <p className="listing-detail-description listing-detail-description-compact">{detail.listing.description}</p>
            </section>

            {showRequestAction ? (
              <section className="listing-detail-action-stack">
                {isListingRequestable ? isVerifiedRecipient ? (
                  <ListingRequestButton listingId={detail.listing.id} initialRequested={requestState?.requested ?? false} />
                ) : (
                  <Link href={requestHref} className="button button-primary">
                    Request item
                  </Link>
                ) : isMatchedReserved ? (
                  <span
                    className={`button ${isMatchedRecipient ? "button-primary" : "listing-detail-status-tag-reserved"} listing-detail-status-tag`}
                    aria-live="polite"
                  >
                    {isMatchedRecipient ? "You have been matched!" : "Reserved"}
                  </span>
                ) : (
                  <p className="listing-detail-note listing-detail-note-subtle">
                    This listing is still visible in the public catalog, but a recipient has already been selected.
                  </p>
                )}
                {recipientCanSave ? (
                  <RecipientSaveListingButton
                    listingId={detail.listing.id}
                    initialSaved={savedState?.saved ?? false}
                    variant="full"
                  />
                ) : null}
              </section>
            ) : null}
          </div>
        </div>

        <section className="listing-detail-facts">
          <h2>Technical overview</h2>
          <div className="listing-detail-facts-grid">
            {coreFacts.map((fact) => (
              <div key={fact.label}>
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="listing-detail-copy">
          <h2>About this item</h2>
          <p>{detail.listing.description}</p>
        </section>

        <div className="listing-detail-context-grid">
          <article className="listing-detail-panel listing-detail-panel-muted">
            <h2>Fulfillment details</h2>
            <dl className="details-meta">
              <div>
                <dt>Delivery mode</dt>
                <dd>{deliveryMode}</dd>
              </div>
              <div>
                <dt>Availability window</dt>
                <dd>{detail.listing.availability_window}</dd>
              </div>
              <div>
                <dt>Documentation</dt>
                <dd>{documentationIncluded}</dd>
              </div>
              <div>
                <dt>Special handling</dt>
                <dd>{specialHandlingFlags}</dd>
              </div>
            </dl>
            <p className="listing-detail-note">
              <strong>Handling requirements:</strong> {handlingRequirements}
            </p>
            <p className="listing-detail-note listing-detail-note-subtle">
              LabLink collects intended use, readiness, and logistics notes before an admin opens messaging or selects
              a recipient.
            </p>
          </article>

          <aside className="listing-detail-panel detail-sidebar listing-detail-panel-muted">
            <h2>Donor institution</h2>
            <p className="listing-detail-panel-lead">{detail.donor_institution.name}</p>
            <dl className="details-meta">
              <div>
                <dt>Verification status</dt>
                <dd>{donorVerification}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{detail.donor_institution.location}</dd>
              </div>
              <div>
                <dt>Posted</dt>
                <dd>{formatDate(detail.listing.created_at)}</dd>
              </div>
              <div>
                <dt>Request activity</dt>
                <dd>{detail.listing.request_count} active request{detail.listing.request_count === 1 ? "" : "s"}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </section>
  );
}
