import { Avatar, ButtonLink, EmptyState, Notice } from "@/components/ui";
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
        <div className="shell">
          <EmptyState
            variant="gate"
            eyebrow="Access limited"
            title={<>Donor access is only available to donor lab accounts.</>}
            lead={<>Your current profile is signed in as {profile.user.role.replaceAll("_", " ")}.</>}
            icon={<Avatar initials="LL" size="lg" />}
          />
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
          <div className="shell">
            <EmptyState
              variant="gate"
              eyebrow={accessState.eyebrow}
              title={<>{accessState.title}</>}
              lead={<>{accessState.description} Your donor lab account is connected to {profile.institution.name}, which is currently {profile.institution.verification_status.replaceAll("_", " ")}.</>}
              icon={<Avatar initials="LL" size="lg" />}
              actions={
                <>
                  <ButtonLink href="/listings" variant="secondary">Browse public catalog</ButtonLink>
                  <ButtonLink href="/auth">Check account status</ButtonLink>
                </>
              }
            >
              <Notice tone="info">
                <strong>Your LabLink information is still saved</strong><br />Listings, request history, and institution details stay in place so access can resume after re-verification.
              </Notice>
            </EmptyState>
          </div>
        </section>
      );
    }
  }

  if (!dashboard) {
    return (
      <section className="page-section">
        <div className="shell">
          <EmptyState
            variant="gate"
            eyebrow="Donor view"
            title={<>Your donor dashboard is not ready yet.</>}
            lead={<>Finish onboarding and make sure your institution has donor lab access before using this workspace.</>}
            icon={<Avatar initials="LL" size="lg" />}
          />
        </div>
      </section>
    );
  }
  const pendingApprovalCount = dashboard.listings.filter(
    (listing) => listing.status === "pending_admin_approval",
  ).length;
  const successfulDeliveries = dashboard.listings.filter((listing) => listing.status === "fulfilled").length;

  return (
    <DonorDashboardWorkspace
      dashboard={dashboard}
      pendingApprovalCount={pendingApprovalCount}
      successfulDeliveries={successfulDeliveries}
    />
  );
}
