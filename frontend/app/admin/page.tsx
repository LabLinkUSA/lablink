import { AdminReviewDashboard } from "@/components/admin-review-dashboard";
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
        <AdminReviewDashboard dashboard={dashboard} />
      </div>
    </section>
  );
}
