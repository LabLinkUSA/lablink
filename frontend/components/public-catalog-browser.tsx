"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useState } from "react";

import { CategoryFilter } from "@/components/catalog/category-filter";
import styles from "@/components/catalog/catalog.module.css";
import { StatusPill } from "@/components/status-pill";
import { ButtonLink, Card, cx, EmptyState, Highlight, PageHeader, Reveal, Select } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Listing } from "@/lib/types";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function PublicCatalogBrowser({ listings }: { listings: Listing[] }) {
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const deferredSearch = useDeferredValue(search);

  const categories = Array.from(new Set(listings.map((listing) => listing.category))).sort((left, right) =>
    left.localeCompare(right),
  );
  const conditions = Array.from(new Set(listings.map((listing) => listing.condition))).sort((left, right) =>
    left.localeCompare(right),
  );
  const locations = Array.from(new Set(listings.map((listing) => listing.location))).sort((left, right) =>
    left.localeCompare(right),
  );

  const query = normalize(deferredSearch);
  const filteredListings = listings.filter((listing) => {
    if (selectedCategories.length > 0 && !selectedCategories.includes(listing.category)) {
      return false;
    }

    if (selectedCondition !== "all" && listing.condition !== selectedCondition) {
      return false;
    }

    if (selectedLocation !== "all" && listing.location !== selectedLocation) {
      return false;
    }

    if (query.length === 0) {
      return true;
    }

    const haystack = [
      listing.title,
      listing.category,
      listing.condition,
      listing.location,
      listing.description,
      listing.working_status,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <PageHeader
          variant="public"
          eyebrow="Equipment catalog"
          title={
            <>
              Inventory <Highlight>Catalog</Highlight>
            </>
          }
          lead={`Browsing ${filteredListings.length} item${filteredListings.length === 1 ? "" : "s"}`}
          actions={
            <label className={styles.search}>
              <span className="sr-only">Search equipment</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by model, category, condition, or location..."
              />
            </label>
          }
        />

        <div className={styles.filterBar} role="toolbar" aria-label="Filters">
          <div className={styles.pillRow}>
            <button
              type="button"
              className={cx(styles.pill, selectedCondition === "all" && styles.pillActive)}
              aria-pressed={selectedCondition === "all"}
              onClick={() => setSelectedCondition("all")}
            >
              All
            </button>
            {conditions.map((condition) => (
              <button
                key={condition}
                type="button"
                className={cx(styles.pill, selectedCondition === condition && styles.pillActive)}
                aria-pressed={selectedCondition === condition}
                onClick={() => setSelectedCondition(condition)}
              >
                {condition}
              </button>
            ))}
          </div>
          <CategoryFilter options={categories} selected={selectedCategories} onChange={setSelectedCategories} />
          <Select
            aria-label="Location"
            className={styles.locationSelect}
            value={selectedLocation}
            onChange={(event) => setSelectedLocation(event.target.value)}
          >
            <option value="all">All locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </Select>
        </div>

        <div className={styles.grid}>
          {filteredListings.map((listing, index) => {
            const photo = listing.photo_urls[0];
            return (
              <Reveal as="div" key={listing.id} delay={(index % 4) * 0.06}>
                <article data-listing-card className={styles.card}>
                  <Link href={`/listings/${listing.id}`} className={styles.media}>
                    {photo ? (
                      <Image
                        src={photo}
                        alt={listing.title}
                        fill
                        sizes="(max-width: 760px) 100vw, 33vw"
                        className={styles.image}
                      />
                    ) : (
                      <span className={styles.mediaEmpty}>No photo</span>
                    )}
                    <span className={styles.statusCaption}>
                      <StatusPill status={listing.status} />
                    </span>
                  </Link>
                  <div className={styles.body}>
                    <div className={styles.headingRow}>
                      <h3 className={styles.title}>{listing.title}</h3>
                      <span className={styles.condition}>{listing.condition}</span>
                    </div>
                    <p className={styles.description}>{listing.description}</p>
                    <div className={styles.meta}>
                      {listing.category} · {listing.location} · Posted {formatDate(listing.created_at)}
                    </div>
                  </div>
                  <div className={styles.footer}>
                    <span>
                      {listing.status === "matched_reserved"
                        ? "Recipient selected"
                        : `${listing.request_count} active request(s)`}
                    </span>
                    <ButtonLink href={`/listings/${listing.id}`} variant="ink" size="sm" arrow>
                      View
                    </ButtonLink>
                  </div>
                </article>
              </Reveal>
            );
          })}
          <Card tone="mint" className={styles.impact}>
            <strong className={styles.impactTitle}>Impact Note</strong>
            <p>
              All equipment shown here has already passed the public listing threshold. Requests still route through
              verified recipient workflows and admin oversight.
            </p>
          </Card>
        </div>

        {filteredListings.length === 0 ? (
          <EmptyState
            variant="empty"
            title="No listings match these filters"
            lead="Try clearing one or more filters, or search with a broader equipment term."
          />
        ) : null}
      </div>
    </section>
  );
}
