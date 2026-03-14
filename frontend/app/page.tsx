import Link from "next/link";

import { ListingCard } from "@/components/listing-card";
import { getPublicListings } from "@/lib/api";

export default async function HomePage() {
  const listings = await getPublicListings();
  const featuredListings = listings.slice(0, 2);

  return (
    <>
      <section className="hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Managed surplus redistribution</span>
            <h1>Move idle lab equipment into active teaching, clinical, and research use.</h1>
            <p>
              LabLink helps donor labs list surplus equipment, verified recipient institutions submit requests, and
              admins coordinate fair, safe allocations from review through fulfillment.
            </p>
            <div className="hero-actions">
              <Link href="/listings" className="button button-primary">
                Browse equipment
              </Link>
              <Link href="/auth" className="button button-outline">
                Start institution verification
              </Link>
            </div>
          </div>
          <div className="hero-card">
            <span className="eyebrow">What v1 includes</span>
            <div className="mini-stat-grid">
              <div className="mini-stat">
                <strong>{listings.length}</strong>
                <span>public listings visible</span>
              </div>
              <div className="mini-stat">
                <strong>Admin-reviewed</strong>
                <span>allocations guided by operational criteria</span>
              </div>
              <div className="mini-stat">
                <strong>3 roles</strong>
                <span>donor, recipient, and admin workflows</span>
              </div>
              <div className="mini-stat">
                <strong>0 checkouts</strong>
                <span>admin-mediated allocation, not ecommerce</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Core features</span>
              <h2>Built around trust, verification, and operational handoff</h2>
            </div>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <h3>Institution onboarding</h3>
              <p>Every donor and recipient account routes through admin verification before it can transact.</p>
            </article>
            <article className="feature-card">
              <h3>Request-scoped messaging</h3>
              <p>Conversations only open inside approved workflows so coordination stays auditable and on-policy.</p>
            </article>
            <article className="feature-card">
              <h3>Allocation oversight</h3>
              <p>Admins review competing requests, apply mission-fit criteria, and guide fulfillment manually.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Featured equipment</span>
              <h2>Current public catalog</h2>
            </div>
            <Link href="/listings" className="button button-secondary">
              See all listings
            </Link>
          </div>
          {featuredListings.length > 0 ? (
            <div className="listing-grid">
              {featuredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
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

      <section className="page-section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Workflow</span>
              <h2>How a managed donation moves through LabLink</h2>
            </div>
          </div>
          <div className="timeline-grid">
            {[
              ["1", "Donor lab submits a listing for moderation before it appears publicly."],
              ["2", "Verified recipients submit structured requests tied to an actual use case."],
              ["3", "Admins review competition, choose a recipient, and open coordination threads."],
              ["4", "Donor confirms the match and fulfillment is tracked through completion."],
            ].map(([step, copy]) => (
              <article key={step} className="timeline-card">
                <div className="timeline-step">Step {step}</div>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="shell two-column-grid">
          <article className="callout">
            <span className="eyebrow">Equipment request board</span>
            <h2>Recipients can signal unmet needs without bypassing moderation.</h2>
            <p>
              Wanted-item posts are visible to verified donor labs and admins, and any response still has to become a
              formal listing before it can be matched.
            </p>
          </article>
          <article className="callout">
            <span className="eyebrow">Role views</span>
            <h2>Explore the operational dashboards built for each actor.</h2>
            <div className="page-actions">
              <Link href="/donor" className="button button-secondary">
                Donor dashboard
              </Link>
              <Link href="/recipient" className="button button-secondary">
                Recipient dashboard
              </Link>
              <Link href="/admin" className="button button-secondary">
                Admin panel
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
