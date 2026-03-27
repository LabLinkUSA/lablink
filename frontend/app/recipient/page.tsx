import Link from "next/link";

import { RecipientDashboardWorkspace } from "@/components/recipient-dashboard-workspace";
import { getCurrentProfile, getRecipientDashboard } from "@/lib/api";
import { isApprovedRecipient } from "@/lib/access";
import { redirectAdminToDashboard } from "@/lib/role-redirect";

function getInstitutionAccessStateMessage(status: string) {
  if (status === "suspended") {
    return {
      eyebrow: "Institution suspended",
      title: "Your recipient access is temporarily unavailable.",
      description:
        "Your institution is currently suspended, so recipient actions stay blocked until an admin restores access.",
    };
  }

  return {
    eyebrow: "Verification pending",
    title: "Your recipient access is waiting on admin verification.",
    description:
      "Your institution is currently pending verification, so dashboard access and item requests stay blocked until approval is complete.",
  };
}

export default async function RecipientPage() {
  const [profile, dashboard] = await Promise.all([getCurrentProfile(), getRecipientDashboard()]);
  redirectAdminToDashboard(profile);

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
    const isVerifiedRecipient = isApprovedRecipient(profile);

    if (!isVerifiedRecipient) {
      const accessState = getInstitutionAccessStateMessage(profile.institution.verification_status);

      return (
        <section className="page-section">
          <div className="shell empty-state">
            <span className="eyebrow">{accessState.eyebrow}</span>
            <h1>{accessState.title}</h1>
            <p>
              {accessState.description} Your recipient account is connected to {profile.institution.name}, which is
              currently {profile.institution.verification_status.replaceAll("_", " ")}.
            </p>
            <div className="auth-state-card">
              <h2>Your LabLink information is still saved</h2>
              <p>
                Requests, saved listings, and institution details stay in place so access can resume once your
                institution is verified.
              </p>
            </div>
            <div className="page-actions">
              <Link href="/listings" className="button button-secondary">
                Browse equipment
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

  const activeRequests = dashboard.requests.filter((request) =>
    !["completed", "rejected_cancelled"].includes(request.status),
  ).length;
  const totalImpact = dashboard.requests.filter((request) =>
    ["approved_matched", "pickup_transfer_coordination", "completed"].includes(request.status),
  ).length;

  return (
    <section className="page-section admin-page-section">
      <div className="admin-page-shell">
        <RecipientDashboardWorkspace
          dashboard={dashboard}
          activeRequests={activeRequests}
          totalImpact={totalImpact}
        />
      </div>
    </section>
  );
}
