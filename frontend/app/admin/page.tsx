import { DashboardPanel } from "@/components/dashboard-panel";
import { StatusPill } from "@/components/status-pill";
import { updateListingStatusAction } from "@/app/admin/actions";
import { getAdminDashboard, getCurrentProfile } from "@/lib/api";

export default async function AdminPage() {
  const [profile, dashboard] = await Promise.all([getCurrentProfile(), getAdminDashboard()]);

  if (profile && profile.user.role !== "admin") {
    return (
      <section className="page-section">
        <div className="shell empty-state">
          <span className="eyebrow">Access limited</span>
          <h1>Admin access is only available to LabLink operators.</h1>
          <p>Your current profile is signed in as {profile.user.role.replaceAll("_", " ")}.</p>
        </div>
      </section>
    );
  }

  if (!dashboard) {
    return (
      <section className="page-section">
        <div className="shell empty-state">
          <span className="eyebrow">Admin view</span>
          <h1>Your admin dashboard is not available.</h1>
          <p>Sign in with an admin account or continue using the public catalog and role-specific onboarding flows.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="shell">
        <div className="page-header">
          <div>
            <span className="eyebrow">Admin operations</span>
            <h1>Moderation, verification, and fulfillment oversight</h1>
            <p>
              Admins verify institutions, moderate listings, choose recipients, monitor threads, and preserve an audit
              trail across the marketplace.
            </p>
          </div>
        </div>

        <div className="dashboard-grid">
          <DashboardPanel title="Institution verification queue" subtitle="Pending or suspended institutions require review.">
            <div className="list">
              {dashboard.pending_institutions.map((institution) => (
                <article key={institution.id} className="list-row">
                  <div className="list-row-topline">
                    <strong>{institution.type.replaceAll("_", " ")}</strong>
                    <StatusPill status={institution.verification_status} />
                  </div>
                  <h3>{institution.name}</h3>
                  <p>{institution.description}</p>
                </article>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Listing moderation queue" subtitle="Listings can enter moderation on submit or after material edits.">
            <div className="list">
              {dashboard.listings_for_review.map((listing) => (
                <article key={listing.id} className="list-row">
                  <div className="list-row-topline">
                    <strong>{listing.category}</strong>
                    <StatusPill status={listing.status} />
                  </div>
                  <h3>{listing.title}</h3>
                  <p>{listing.handling_requirements}</p>
                  <div className="list-row-meta">
                    <span>{listing.location}</span>
                    <span>{listing.quantity} unit(s)</span>
                  </div>
                  <form action={updateListingStatusAction} className="inline-form">
                    <input type="hidden" name="listingId" value={listing.id} />
                    <select name="status" defaultValue={listing.status} aria-label={`Update ${listing.title} status`}>
                      <option value="pending_admin_approval">Pending approval</option>
                      <option value="live">Approve and publish</option>
                      <option value="under_review">Needs follow-up</option>
                      <option value="removed_expired">Remove from marketplace</option>
                    </select>
                    <button type="submit" className="button button-secondary">
                      Update status
                    </button>
                  </form>
                </article>
              ))}
            </div>
          </DashboardPanel>
        </div>

        <div className="dashboard-grid" style={{ marginTop: "1rem" }}>
          <DashboardPanel title="Request competition" subtitle="Multiple institutions can request the same listing. Admin chooses the match.">
            <div className="list">
              {dashboard.requests_requiring_attention.map((request) => (
                <article key={request.id} className="list-row">
                  <div className="list-row-topline">
                    <strong>{request.program_or_department}</strong>
                    <StatusPill status={request.status} />
                  </div>
                  <h3>{request.intended_use}</h3>
                  <p>{request.urgency_notes}</p>
                </article>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Active threads and audit trail" subtitle="Admin visibility keeps conversations safe and operationally manageable.">
            <div className="list">
              {dashboard.active_threads.map((thread) => (
                <article key={thread.id} className="list-row">
                  <div className="list-row-topline">
                    <strong>{thread.id}</strong>
                    <StatusPill status={thread.status} />
                  </div>
                  <p>Linked listing: {thread.listing_id}</p>
                </article>
              ))}
              {dashboard.recent_actions.map((action) => (
                <article key={action.id} className="list-row">
                  <div className="list-row-topline">
                    <strong>{action.action_type.replaceAll("_", " ")}</strong>
                    <span>{action.created_at.slice(0, 10)}</span>
                  </div>
                  <p>{action.notes}</p>
                </article>
              ))}
            </div>
          </DashboardPanel>
        </div>
      </div>
    </section>
  );
}
