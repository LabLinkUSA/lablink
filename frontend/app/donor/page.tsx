import { DashboardPanel } from "@/components/dashboard-panel";
import { StatusPill } from "@/components/status-pill";
import { titleCaseStatus } from "@/lib/format";
import { getDonorDashboard, getDonorRequestBoard } from "@/lib/api";

export default async function DonorPage() {
  const [dashboard, requestBoardPosts] = await Promise.all([getDonorDashboard(), getDonorRequestBoard()]);

  return (
    <section className="page-section">
      <div className="shell">
        <div className="page-header">
          <div>
            <span className="eyebrow">Verified donor view</span>
            <h1>{dashboard.institution.name}</h1>
            <p>Create listings, monitor active request competition, and track fulfilled donation impact.</p>
          </div>
        </div>

        <div className="metric-grid">
          <article className="metric-card">
            <span>Active listings</span>
            <strong>{dashboard.impact_summary.active_listings}</strong>
          </article>
          <article className="metric-card">
            <span>Total items donated</span>
            <strong>{dashboard.impact_summary.total_items_donated}</strong>
          </article>
          <article className="metric-card">
            <span>Institutions served</span>
            <strong>{dashboard.impact_summary.institutions_served}</strong>
          </article>
        </div>

        <div className="dashboard-grid">
          <DashboardPanel
            title="Listings"
            subtitle="New submissions enter pending admin approval. Material edits can return a listing to review."
          >
            <div className="list">
              {dashboard.listings.map((listing) => (
                <article key={listing.id} className="list-row">
                  <div className="list-row-topline">
                    <strong>{listing.category}</strong>
                    <StatusPill status={listing.status} />
                  </div>
                  <h3>{listing.title}</h3>
                  <p>{listing.description}</p>
                  <div className="list-row-meta">
                    <span>{listing.location}</span>
                    <span>{listing.quantity} unit(s)</span>
                    <span>{listing.request_count} request(s)</span>
                  </div>
                </article>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Incoming requests"
            subtitle="Admin allocates recipients when multiple institutions request the same item."
          >
            <div className="list">
              {dashboard.active_requests.map((request) => (
                <article key={request.id} className="list-row">
                  <div className="list-row-topline">
                    <strong>{request.program_or_department}</strong>
                    <StatusPill status={request.status} />
                  </div>
                  <h3>{request.intended_use}</h3>
                  <p>{request.delivery_constraints}</p>
                  <div className="list-row-meta">
                    <span>Needed by {request.needed_by}</span>
                    <span>{titleCaseStatus(request.status)}</span>
                  </div>
                </article>
              ))}
            </div>
          </DashboardPanel>
        </div>

        <div className="dashboard-grid" style={{ marginTop: "1rem" }}>
          <DashboardPanel
            title="Request board opportunities"
            subtitle="Verified donor labs can browse unmet equipment needs and respond by creating a new listing."
          >
            <div className="list">
              {requestBoardPosts.map((post) => (
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
