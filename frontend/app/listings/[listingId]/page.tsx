import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ListingRequestButton } from "@/components/listing-request-button";
import { RecipientSaveListingButton } from "@/components/recipient-save-listing-button";
import styles from "@/components/listing-detail/listing-detail.module.css";
import { StatusPill } from "@/components/status-pill";
import { Avatar, ButtonLink, Card, Eyebrow, buttonClass, cx } from "@/components/ui";
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
    <section className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link href="/listings">Equipment</Link>
          <span aria-hidden="true">/</span>
          <span>{detail.listing.category}</span>
          <span aria-hidden="true">/</span>
          <span>{detail.listing.title}</span>
        </nav>

        <div className={styles.hero}>
          <div className={styles.mediaWrap}>
            <div data-detail-media className={styles.media}>
              {detail.listing.photo_urls[0] ? (
                <Image
                  src={detail.listing.photo_urls[0]}
                  alt={detail.listing.title}
                  fill
                  sizes="(max-width: 1100px) 100vw, 50vw"
                  className={styles.image}
                />
              ) : (
                <div className={styles.empty}>No image</div>
              )}
              <span className={styles.chip}>
                {detail.donor_institution.verification_status === "verified" ? "Verified donor" : donorVerification}
              </span>
            </div>
            {detail.listing.request_count > 0 ? (
              <div className={styles.floatBadge}>
                <div className={styles.floatValue}>{detail.listing.request_count}</div>
                <div className={styles.floatLabel}>active request{detail.listing.request_count === 1 ? "" : "s"}</div>
              </div>
            ) : null}
          </div>

          <div className={styles.copy}>
            <div className={styles.statusRow}>
              <StatusPill status={detail.listing.status} />
              <Eyebrow as="span">{detail.listing.category}</Eyebrow>
            </div>
            <h1 className={styles.title}>{detail.listing.title}</h1>
            <div className={styles.donorRow}>
              <Avatar initials={donorInitials} />
              <span>
                Donated by <strong>{detail.donor_institution.name}</strong>
              </span>
            </div>
            <p className={styles.description}>{detail.listing.description}</p>

            {showRequestAction ? (
              <div className={styles.actions}>
                {isListingRequestable ? isVerifiedRecipient ? (
                  <ListingRequestButton listingId={detail.listing.id} initialRequested={requestState?.requested ?? false} />
                ) : (
                  <ButtonLink href={requestHref} size="lg" arrow>
                    Request item
                  </ButtonLink>
                ) : isMatchedReserved ? (
                  <span
                    className={buttonClass({ variant: isMatchedRecipient ? "primary" : "secondary", size: "lg" })}
                    aria-live="polite"
                  >
                    {isMatchedRecipient ? "You have been matched!" : "Reserved"}
                  </span>
                ) : (
                  <p>This listing is still visible in the public catalog, but a recipient has already been selected.</p>
                )}
                {recipientCanSave ? (
                  <RecipientSaveListingButton
                    listingId={detail.listing.id}
                    initialSaved={savedState?.saved ?? false}
                    variant="full"
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Technical overview</h2>
          <div className={styles.facts}>
            {coreFacts.map((fact) => (
              <div data-fact-tile key={fact.label} className={styles.fact}>
                <div className={styles.factLabel}>{fact.label}</div>
                <div className={styles.factValue}>{fact.value}</div>
              </div>
            ))}
          </div>

          <div className={styles.context}>
            <Card>
              <h2 className={styles.cardTitle}>About this item</h2>
              <p className={styles.body}>{detail.listing.description}</p>
            </Card>

            <Card tone="ink" className={styles.onInk}>
              <h2 className={styles.cardTitle}>Fulfillment details</h2>
              <dl className={styles.dl}>
                <dt>Delivery mode</dt>
                <dd>{deliveryMode}</dd>
                <dt>Availability window</dt>
                <dd>{detail.listing.availability_window}</dd>
                <dt>Documentation</dt>
                <dd>{documentationIncluded}</dd>
                <dt>Special handling</dt>
                <dd>{specialHandlingFlags}</dd>
              </dl>
              <p className={styles.note}>
                <strong>Handling requirements:</strong> {handlingRequirements}
              </p>
              <p className={cx(styles.note, styles.noteSubtle)}>
                LabLink collects intended use, readiness, and logistics notes before an admin opens messaging or selects
                a recipient.
              </p>
            </Card>

            <Card>
              <h2 className={styles.cardTitle}>Donor institution</h2>
              <p className={styles.lead}>{detail.donor_institution.name}</p>
              <dl className={styles.dl}>
                <dt>Verification status</dt>
                <dd>{donorVerification}</dd>
                <dt>Location</dt>
                <dd>{detail.donor_institution.location}</dd>
                <dt>Posted</dt>
                <dd>{formatDate(detail.listing.created_at)}</dd>
                <dt>Request activity</dt>
                <dd>
                  {detail.listing.request_count} active request{detail.listing.request_count === 1 ? "" : "s"}
                </dd>
              </dl>
            </Card>
          </div>
        </section>
      </div>
    </section>
  );
}
