import Link from "next/link";

import { DonorDashboardWorkspace } from "@/components/donor-dashboard-workspace";
import { getCurrentProfile, getDonorDashboard } from "@/lib/api";
import { redirectAdminToDashboard } from "@/lib/role-redirect";

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
  const [profile, dashboard] = await Promise.all([getCurrentProfile(), getDonorDashboard()]);
  redirectAdminToDashboard(profile);

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

  if (!dashboard) {
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
  const pendingApprovalCount = dashboard.listings.filter((listing) =>
    ["pending_admin_approval", "under_review"].includes(listing.status),
  ).length;
  const successfulDeliveries = dashboard.listings.filter((listing) => listing.status === "fulfilled").length;

  return (
    <section className="page-section admin-page-section">
      <div className="admin-page-shell">
        <DonorDashboardWorkspace
          dashboard={dashboard}
          pendingApprovalCount={pendingApprovalCount}
          successfulDeliveries={successfulDeliveries}
        />
      </div>
    </section>
  );
}
