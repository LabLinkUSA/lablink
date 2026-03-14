import { DashboardPanel } from "@/components/dashboard-panel";
import { StatusPill } from "@/components/status-pill";
import { getRecipientDashboard } from "@/lib/api";

export default async function RecipientPage() {
  const dashboard = await getRecipientDashboard();

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
                <article key={listing.id} className="list-row">
                  <div className="list-row-topline">
                    <strong>{listing.category}</strong>
                    <StatusPill status={listing.status} />
                  </div>
                  <h3>{listing.title}</h3>
                  <p>{listing.location}</p>
                </article>
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

