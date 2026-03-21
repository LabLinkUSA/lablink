import { DashboardPanel } from "@/components/dashboard-panel";
import { DonorListingActions } from "@/components/donor-listing-actions";
import { ListingListRow } from "@/components/listing-list-row";
import { StatusPill } from "@/components/status-pill";
import { getCurrentProfile, getDonorDashboard, getDonorRequestBoard } from "@/lib/api";
import { titleCaseStatus } from "@/lib/format";
import Link from "next/link";

function getInstitutionAccessStateMessage(status: string) {
  if (status === "suspended") {
    return {
      eyebrow: "Institution suspended",
      title: "Your donor dashboard is temporarily unavailable.",
      description:
        "Your institution is currently suspended, so donor actions are paused until an admin restores access.",
    };
  }

  return {
    eyebrow: "Verification pending",
    title: "Your donor dashboard is waiting on admin verification.",
    description:
      "Your institution is currently pending verification, so donor actions stay blocked until approval is complete.",
  };
}

export default async function DonorPage() {
  const [profile, dashboard, requestBoardPosts] = await Promise.all([
    getCurrentProfile(),
    getDonorDashboard(),
    getDonorRequestBoard(),
  ]);

  if (profile && profile.user.role !== "donor_lab") {
    return (
      <section className="page-section">
        <div className="shell empty-state">
          <span className="eyebrow">Access limited</span>
          <h1>Donor access is only available to donor lab accounts.</h1>
          <p>Your current profile is signed in as {profile.user.role.replaceAll("_", " ")}.</p>
        </div>
      </section>
    );
  }

  if (profile?.user.role === "donor_lab") {
    const isVerifiedDonor =
      profile.user.account_status === "verified" && profile.institution.verification_status === "verified";

    if (!isVerifiedDonor) {
      const accessState = getInstitutionAccessStateMessage(profile.institution.verification_status);

      return (
        <section className="page-section">
          <div className="shell empty-state">
            <span className="eyebrow">{accessState.eyebrow}</span>
            <h1>{accessState.title}</h1>
            <p>
              {accessState.description} Your donor lab account is connected to {profile.institution.name}, which is
              currently {profile.institution.verification_status.replaceAll("_", " ")}.
            </p>
            <div className="auth-state-card">
              <h2>Your LabLink information is still saved</h2>
              <p>Listings, request history, and institution details stay in place so access can resume after re-verification.</p>
            </div>
            <div className="page-actions">
              <Link href="/listings" className="button button-secondary">
                Browse equipment
              </Link>
              <Link href="/auth" className="button button-primary">
                Check account status
              </Link>
            </div>
          </div>
        </section>
      );
    }
  }

  if (!dashboard || !requestBoardPosts) {
    return (
      <section className="page-section">
        <div className="shell empty-state">
          <span className="eyebrow">Donor view</span>
          <h1>Your donor dashboard is not ready yet.</h1>
          <p>Finish onboarding and make sure your institution has donor lab access before using this workspace.</p>
        </div>
      </section>
    );
  }

  const groupedIncomingRequests = Array.from(
    dashboard.active_requests.reduce((groups, request) => {
      const existingGroup = groups.get(request.listing_id);
      if (existingGroup) {
        existingGroup.requests.push(request);
        return groups;
      }

      groups.set(request.listing_id, {
        listing: request.listing,
        requests: [request],
      });
      return groups;
    }, new Map<string, { listing: (typeof dashboard.active_requests)[number]["listing"]; requests: typeof dashboard.active_requests }>()),
  );

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
                <ListingListRow
                  key={listing.id}
                  listing={listing}
                  description={listing.description}
                  meta={
                    <div className="list-row-meta">
                      <span>{listing.location}</span>
                      <span>{listing.quantity} unit(s)</span>
                      <span>{listing.request_count} request(s)</span>
                    </div>
                  }
                  actions={<DonorListingActions listingId={listing.id} status={listing.status} />}
                />
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Incoming requests"
            subtitle="Admin allocates recipients when multiple institutions request the same item."
          >
            <div className="list">
              {groupedIncomingRequests.map(([listingId, group]) => (
                group.listing ? (
                  <ListingListRow
                    key={listingId}
                    listing={group.listing}
                    description={`${group.requests.length} institution${group.requests.length === 1 ? "" : "s"} requesting this listing`}
                    meta={
                      <div className="list-row-meta">
                        <span>{group.requests.length} request(s)</span>
                        <span>Latest needed by {group.requests[0]?.needed_by}</span>
                        <span>{group.requests[0]?.delivery_constraints}</span>
                      </div>
                    }
                    actions={<StatusPill status={group.requests[0]?.status ?? "submitted"} />}
                  />
                ) : (
                  <article key={listingId} className="list-row">
                    <div className="list-row-topline">
                      <strong>{group.requests.length} request(s)</strong>
                      <StatusPill status={group.requests[0]?.status ?? "submitted"} />
                    </div>
                    <h3>Request competition for listing {listingId}</h3>
                    <p>Multiple recipient institutions have requested this item.</p>
                    <div className="list-row-meta">
                      <span>Latest needed by {group.requests[0]?.needed_by}</span>
                      <span>{titleCaseStatus(group.requests[0]?.status ?? "submitted")}</span>
                    </div>
                  </article>
                )
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
