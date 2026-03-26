"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useState } from "react";

import { formatDate } from "@/lib/format";
import type { Listing } from "@/lib/types";
import { StatusPill } from "@/components/status-pill";

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

  function handleCategoryToggle(category: string) {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((entry) => entry !== category) : [...current, category],
    );
  }

  return (
    <div className="catalog-browser">
      <aside className="catalog-sidebar">
        <div className="catalog-filter-stack">
          <div className="catalog-filter-heading">
            <h2>Filters</h2>
          </div>

          <section className="catalog-filter-section">
            <h3>Category</h3>
            <div className="catalog-checkbox-list">
              {categories.map((category) => (
                <label key={category} className="catalog-checkbox-row">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => handleCategoryToggle(category)}
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="catalog-filter-section">
            <h3>Condition</h3>
            <div className="catalog-pill-row">
              <button
                type="button"
                className={selectedCondition === "all" ? "catalog-pill catalog-pill-active" : "catalog-pill"}
                onClick={() => setSelectedCondition("all")}
              >
                All
              </button>
              {conditions.map((condition) => (
                <button
                  key={condition}
                  type="button"
                  className={selectedCondition === condition ? "catalog-pill catalog-pill-active" : "catalog-pill"}
                  onClick={() => setSelectedCondition(condition)}
                >
                  {condition}
                </button>
              ))}
            </div>
          </section>

          <section className="catalog-filter-section">
            <h3>Location</h3>
            <div className="catalog-select-wrap">
              <select value={selectedLocation} onChange={(event) => setSelectedLocation(event.target.value)}>
                <option value="all">All locations</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
              <span className="catalog-select-caret" aria-hidden="true">
                ▾
              </span>
            </div>
          </section>
        </div>

        <div className="catalog-impact-note">
          <div className="catalog-impact-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M10.33 2.75a1.5 1.5 0 0 0-1.5 1.5v.5H7.5A1.75 1.75 0 0 0 5.75 6.5v10.25c0 .97.78 1.75 1.75 1.75h9A1.75 1.75 0 0 0 18.25 16.75V6.5a1.75 1.75 0 0 0-1.75-1.75h-1.33v-.5a1.5 1.5 0 0 0-1.5-1.5Zm0 2h3.34v1.17h-3.34Zm1.67 3.08a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5Zm0 1.5a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <p>
            <strong>Impact Note</strong>
            All equipment shown here has already passed the public listing threshold. Requests still route through
            verified recipient workflows and admin oversight.
          </p>
        </div>
      </aside>

      <div className="catalog-main">
        <div className="catalog-topbar">
          <div>
            <h1>Inventory Catalog</h1>
            <p>
              Browsing {filteredListings.length} item{filteredListings.length === 1 ? "" : "s"} matching your current
              criteria.
            </p>
          </div>
          <div className="catalog-search-shell">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by model, category, condition, or location..."
              aria-label="Search public catalog"
            />
            <span className="catalog-search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M10.75 4.75a6 6 0 1 0 3.87 10.58l3.9 3.9 1.06-1.06-3.9-3.9a6 6 0 0 0-4.93-9.52Zm0 1.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </div>
        </div>

        {filteredListings.length > 0 ? (
          <div className="catalog-card-grid">
            {filteredListings.map((listing) => (
              <article key={listing.id} className="catalog-card">
                <div className="catalog-card-media">
                  {listing.photo_urls[0] ? (
                    <Image
                      src={listing.photo_urls[0]}
                      alt={listing.title}
                      fill
                      sizes="(max-width: 1100px) 100vw, 50vw"
                      className="catalog-card-image"
                    />
                  ) : (
                    <div className="catalog-card-empty">No image</div>
                  )}
                  <div className="catalog-card-status">
                    <StatusPill status={listing.status} />
                  </div>
                </div>
                <div className="catalog-card-body">
                  <div className="catalog-card-heading">
                    <h3>{listing.title}</h3>
                    <span className="catalog-condition-tag">{listing.condition}</span>
                  </div>
                  <p>{listing.description}</p>
                  <div className="catalog-card-meta">
                    <span>{listing.category}</span>
                    <span>{listing.location}</span>
                    <span>Posted {formatDate(listing.created_at)}</span>
                  </div>
                  <div className="catalog-card-footer">
                    <span>{listing.request_count} active request(s)</span>
                    <Link href={`/listings/${listing.id}`} className="catalog-card-cta">
                      View Listing
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>No listings match these filters</h2>
            <p>Try clearing one or more filters, or search with a broader equipment term.</p>
          </div>
        )}
      </div>
    </div>
  );
}
