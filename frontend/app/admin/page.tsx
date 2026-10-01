import { Avatar, EmptyState } from "@/components/ui";
import { AdminReviewDashboard } from "@/components/admin-review-dashboard";
import { getAdminDashboard, getCurrentProfile } from "@/lib/api";

export default async function AdminPage() {
  const [profile, dashboard] = await Promise.all([getCurrentProfile(), getAdminDashboard()]);

  if (profile && profile.user.role !== "admin") {
    return (
      <section className="page-section">
        <div className="shell">
          <EmptyState
            variant="gate"
            eyebrow="Access limited"
            title={<>Admin access is only available to LabLink operators.</>}
            lead={<>Your current profile is signed in as {profile.user.role.replaceAll("_", " ")}.</>}
            icon={<Avatar initials="LL" size="lg" />}
          />
        </div>
      </section>
    );
  }

  if (!dashboard) {
    return (
      <section className="page-section">
        <div className="shell">
          <EmptyState
            variant="gate"
            eyebrow="Admin view"
            title={<>Your admin dashboard is not available.</>}
            lead={<>Sign in with an admin account or continue using the public catalog and role-specific onboarding flows.</>}
            icon={<Avatar initials="LL" size="lg" />}
          />
        </div>
      </section>
    );
  }

  return (
    <AdminReviewDashboard dashboard={dashboard} />
  );
}
