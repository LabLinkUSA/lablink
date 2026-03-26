import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { getCurrentProfile, getPublicListings } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { redirectAdminToDashboard } from "@/lib/role-redirect";

const STITCH_HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAgzvohvKONSEQwPRS6QLi_ZhKoyLpNTAs9LVl-SwcH6N8jVxaSourTgAdUle5s4rhGJrACg4ekXBAbbjfh08WNtuDfDBhMJbnxF_M_jflUcfnKInuq4V7c1ia2W63NGZaMiHqT3DImL9vQyg88GvZqob28rU2KCqrE8R1n71h9D_F7b0vyEic7pVJCGDiJh1pxQMuXYN4M0Uuz6hb9yQ9hRLixeK6ivWPDTctZMeQB0P00SDoSmoc0UMAwjO6E1Uv00881Xt0Aqao";

function AssessmentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 4.75h12A1.25 1.25 0 0 1 19.25 6v12A1.25 1.25 0 0 1 18 19.25H6A1.25 1.25 0 0 1 4.75 18V6A1.25 1.25 0 0 1 6 4.75Zm1 2v10.5h10V6.75Zm1.75 2h6.5v1.5h-6.5Zm0 3h6.5v1.5h-6.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CertificationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5 5.75 6v5.12c0 4.02 2.6 7.71 6.25 9.38 3.65-1.67 6.25-5.36 6.25-9.38V6Zm2.47 6.1 1.06 1.06-4.4 4.4-2.24-2.24 1.06-1.06 1.18 1.18Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RedistributionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.75 7.5h10.5a1.75 1.75 0 0 1 1.75 1.75v.75h1.69c.53 0 1.02.28 1.33.74l1.53 2.3c.19.29.3.63.3.98v2.23h-1.83a2.75 2.75 0 0 1-5.34 0H9.09a2.75 2.75 0 0 1-5.34 0H2.75V9.25A1.75 1.75 0 0 1 4.5 7.5Zm12.25 4v2.25h3.08l-1.08-1.62a.25.25 0 0 0-.2-.13Zm-10.5 3.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm10.92 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9.53 6.47 1.06-1.06L17.18 12l-6.6 6.6-1.05-1.07L15.06 12z" fill="currentColor" />
    </svg>
  );
}

export default async function HomePage() {
  const [profile, listings] = await Promise.all([getCurrentProfile(), getPublicListings()]);
  redirectAdminToDashboard(profile);
  const featuredListings = listings.slice(0, 3);
  const categoryCount = new Set(listings.map((listing) => listing.category)).size;
  const locationCount = new Set(listings.map((listing) => listing.location)).size;

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="shell landing-hero-grid">
          <div className="landing-hero-copy">
            <h1 className="landing-hero-title">
              Bridge the <span>Gap</span> in Science
            </h1>
            <p className="landing-hero-summary">
              LabLink facilitates the seamless transfer of surplus clinical equipment from high-resource laboratories
              to institutions in need. Excellence shouldn&apos;t be limited by budget.
            </p>
            <div className="landing-hero-actions">
              <Link href="/auth" className="button button-primary">
                Donate Equipment
              </Link>
              <Link href="/listings" className="button landing-ghost-button">
                Browse Surplus
              </Link>
            </div>
          </div>
          <div className="landing-hero-media">
            <div className="landing-hero-frame" />
            <img
              src={STITCH_HERO_IMAGE}
              alt="Modern bright clinical laboratory with high-end microscopes and stainless steel surfaces in soft morning light"
              className="landing-hero-image"
            />
          </div>
        </div>
      </section>

      <section className="landing-stats">
        <div className="shell">
          <div className="landing-stats-grid">
            <article className="landing-stat-card landing-stat-card-primary">
              <strong>{listings.length}</strong>
              <span>Approved listings live</span>
            </article>
            <article className="landing-stat-card landing-stat-card-secondary">
              <strong>{categoryCount}</strong>
              <span>Equipment categories represented</span>
            </article>
            <article className="landing-stat-card landing-stat-card-tertiary">
              <strong>{locationCount}</strong>
              <span>Active institution locations</span>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="shell">
          <div className="landing-section-header">
            <div>
              <h2>Available Inventory</h2>
              <p>Verified clinical-grade equipment ready for deployment.</p>
            </div>
            <Link href="/listings" className="landing-section-link">
              See all listings
            </Link>
          </div>
          {featuredListings.length > 0 ? (
            <div className="landing-card-grid">
              {featuredListings.map((listing) => (
                <article key={listing.id} className="landing-listing-card">
                  <div className="landing-listing-media">
                    {listing.photo_urls[0] ? (
                      <img src={listing.photo_urls[0]} alt={listing.title} className="landing-listing-image" />
                    ) : (
                      <div className="landing-listing-empty">No listing image available</div>
                    )}
                    <div className="landing-listing-status">
                      <StatusPill status={listing.status} />
                    </div>
                  </div>
                  <div className="landing-listing-content">
                    <h3>{listing.title}</h3>
                    <p>{listing.description}</p>
                    <small>
                      {listing.location} · Posted {formatDate(listing.created_at)}
                    </small>
                    <div className="landing-listing-footer">
                      <span>{listing.request_count} active request(s)</span>
                      <Link href={`/listings/${listing.id}`} className="landing-listing-arrow" aria-label={`View ${listing.title}`}>
                        <ChevronIcon />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No public listings yet</h3>
              <p>
                Donor institutions have not published any approved equipment yet. Once listings go live, they will
                appear here first.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="landing-lifecycle">
        <div className="shell">
          <h2>The LabLink Lifecycle</h2>
          <div className="landing-lifecycle-grid">
            <article className="landing-step-card">
              <div className="landing-step-icon landing-step-icon-primary">
                <AssessmentIcon />
              </div>
              <h3>1. Assessment</h3>
              <p>Donating labs list equipment through our streamlined digital portal with full technical specs.</p>
            </article>
            <article className="landing-step-card">
              <div className="landing-step-icon landing-step-icon-secondary">
                <CertificationIcon />
              </div>
              <h3>2. Certification</h3>
              <p>Admins verify institutions and moderate every listing before it becomes visible in the public catalog.</p>
            </article>
            <article className="landing-step-card">
              <div className="landing-step-icon landing-step-icon-tertiary">
                <RedistributionIcon />
              </div>
              <h3>3. Redistribution</h3>
              <p>Matched recipient institutions coordinate fulfillment through tracked, request-scoped workflows.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="shell">
          <div className="landing-cta-panel">
            <div className="landing-cta-content">
              <h2>Ready to Advance Science?</h2>
              <p>
                Join a network of verified donor labs, recipient institutions, and admins coordinating sustainable
                equipment reuse through one managed workflow.
              </p>
              <div className="landing-cta-actions">
                <Link href="/auth" className="landing-cta-primary">
                  Start institution verification
                </Link>
                <Link href="/listings" className="landing-cta-secondary">
                  Browse equipment
                </Link>
              </div>
              <div className="landing-role-actions">
                <Link href="/donor" className="landing-cta-secondary">
                  Donor dashboard
                </Link>
                <Link href="/recipient" className="landing-cta-secondary">
                  Recipient dashboard
                </Link>
                <Link href="/admin" className="landing-cta-secondary">
                  Admin panel
                </Link>
              </div>
            </div>
            <div className="landing-cta-glow landing-cta-glow-primary" />
            <div className="landing-cta-glow landing-cta-glow-secondary" />
          </div>
        </div>
      </section>
    </div>
  );
}
