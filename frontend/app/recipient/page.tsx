import Link from "next/link";

import { ListingListRow } from "@/components/listing-list-row";
import { DashboardPanel } from "@/components/dashboard-panel";
import { StatusPill } from "@/components/status-pill";
import { getCurrentProfile, getRecipientDashboard } from "@/lib/api";

export default async function RecipientPage() {
  const [profile, dashboard] = await Promise.all([getCurrentProfile(), getRecipientDashboard()]);

  if (profile && profile.user.role !== "recipient_institution") {
    return (
      <section className="page-section">
        <div className="shell empty-state">
          <span className="eyebrow">Access limited</span>
          <h1>Recipient access is only available to recipient institution accounts.</h1>
          <p>Your current profile is signed in as {profile.user.role.replaceAll("_", " ")}.</p>
        </div>
      </section>
    );
  }

  if (profile?.user.role === "recipient_institution") {
    const isVerifiedRecipient =
      profile.user.account_status === "verified" && profile.institution.verification_status === "verified";

    if (!isVerifiedRecipient) {
      return (
        <section className="page-section">
          <div className="shell empty-state">
            <span className="eyebrow">Verification required</span>
            <h1>Your institution must be admin-verified before you can request equipment.</h1>
            <p>
              Your recipient account is connected to {profile.institution.name}, which is currently{" "}
              {profile.institution.verification_status.replaceAll("_", " ")}.
            </p>
            <div className="auth-state-card">
              <h2>What happens next</h2>
              <p>Once LabLink admin verification is complete, you can return here to request listings and track activity.</p>
            </div>
            <div className="page-actions">
              <Link href="/listings" className="button button-secondary">
                Back to listings
              </Link>
              <Link href="/auth" className="button button-primary">
                Check verification status
              </Link>
            </div>
          </div>
        </section>
      );
    }
  }

  if (!dashboard) {
    return (
      <section className="page-section">
        <div className="shell empty-state">
          <span className="eyebrow">Recipient view</span>
          <h1>Your recipient dashboard is not ready yet.</h1>
          <p>Finish onboarding and wait for institution verification before using recipient workflows.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="shell">
        <div className="page-header">
          <div>
            <span className="eyebrow">Verified recipient view</span>
            <h1>{dashboard.institution.name}</h1>
            <p>Track request status, request-scoped threads, and wanted-item posts without bypassing listing review.</p>
          </div>
        </div>

        <div className="dashboard-grid">
          <DashboardPanel title="Requests" subtitle="Only admin-verified institutions can submit equipment requests.">
            <div className="list">
              {dashboard.requests.map((request) => (
                <article key={request.id} className="list-row">
                  <div className="list-row-topline">
                    <strong>{request.program_or_department}</strong>
                    <StatusPill status={request.status} />
                  </div>
                  <h3>{request.intended_use}</h3>
                  <p>{request.storage_readiness}</p>
                  <div className="list-row-meta">
                    <span>Needed by {request.needed_by}</span>
                    <span>{request.delivery_constraints}</span>
                  </div>
                </article>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel title="Saved listings" subtitle="Recipients can save listings while they complete verification.">
            <div className="list">
              {dashboard.saved_listings.map((listing) => (
                <ListingListRow
                  key={listing.id}
                  listing={listing}
                  description={listing.location}
                  meta={
                    <div className="list-row-meta">
                      <span>{listing.quantity} unit(s)</span>
                      <span>{listing.availability_window}</span>
                    </div>
                  }
                />
              ))}
            </div>
          </DashboardPanel>
        </div>

        <div className="dashboard-grid" style={{ marginTop: "1rem" }}>
          <DashboardPanel title="Message threads" subtitle="Messaging is scoped to active requests and visible to admins.">
            <div className="list">
              {dashboard.threads.map((thread) => (
                <article key={thread.id} className="message-row">
                  <div className="message-row-topline">
                    <strong>{thread.id}</strong>
                    <StatusPill status={thread.status} />
                  </div>
                  <p>Thread linked to request {thread.request_id}</p>
                </article>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Equipment request board"
            subtitle="Wanted-item posts are visible to verified donor labs and still route through listing approval."
          >
            <div className="list">
              {dashboard.request_board_posts.map((post) => (
                <article key={post.id} className="list-row">
                  <div className="list-row-topline">
                    <strong>{post.category}</strong>
                    <StatusPill status={post.status} />
                  </div>
                  <h3>{post.title}</h3>
                  <p>{post.description}</p>
                </article>
              ))}
            </div>
          </DashboardPanel>
        </div>
      </div>
    </section>
  );
}
