import { getCurrentProfile } from "@/lib/api";
import { redirectAdminToDashboard } from "@/lib/role-redirect";

export default async function AboutPage() {
  const profile = await getCurrentProfile();
  redirectAdminToDashboard(profile);

  return (
    <section className="page-section">
      <div className="shell page-stack">
        <div className="page-header page-header-tight">
          <div>
            <span className="eyebrow">About LabLink</span>
            <h1>Trust matters more than transaction speed when scientific equipment changes hands.</h1>
            <p>
              The rest of the frontend now follows the same Stitch visual system: clinical light surfaces, strong
              type, admin-mediated workflow framing, and fewer decorative containers around operational content.
            </p>
          </div>
        </div>

        <div className="two-column-grid">
          <article className="callout">
            <span className="eyebrow">Why LabLink exists</span>
            <h2>Reuse only works when the handoff is credible.</h2>
            <p>
              LabLink is designed for scientific and clinical equipment that often requires storage readiness, training,
              special handling, or institutional authority. That is why v1 is a managed marketplace instead of a direct
              checkout flow.
            </p>
          </article>
          <article className="callout">
            <span className="eyebrow">What v1 avoids</span>
            <h2>Deliberate non-goals</h2>
            <p>
              No buyer-to-seller checkout, no volunteer courier network, and no open-ended direct messages outside
              request workflows.
            </p>
          </article>
        </div>

        <div className="feature-grid feature-grid-compact">
          <article className="feature-card">
            <h3>Verification first</h3>
            <p>Donor labs and recipient institutions are operational actors, not anonymous marketplace accounts.</p>
          </article>
          <article className="feature-card">
            <h3>Moderated allocation</h3>
            <p>Requests compete fairly under admin review instead of turning into first-come, first-served checkout.</p>
          </article>
          <article className="feature-card">
            <h3>Tracked fulfillment</h3>
            <p>Listings, requests, threads, and impact outcomes stay connected inside one auditable workflow.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
