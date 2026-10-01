import { Avatar, ButtonLink, EmptyState, Notice } from "@/components/ui";
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
        <div className="shell">
          <EmptyState
            variant="gate"
            headingLevel={1}
            eyebrow="Access limited"
            title={<>Recipient access is only available to recipient institution accounts.</>}
            lead={<>Your current profile is signed in as {profile.user.role.replaceAll("_", " ")}.</>}
            icon={<Avatar initials="LL" size="lg" />}
          />
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
          <div className="shell">
            <EmptyState
              variant="gate"
            headingLevel={1}
              eyebrow={accessState.eyebrow}
              title={<>{accessState.title}</>}
              lead={<>{accessState.description} Your recipient account is connected to {profile.institution.name}, which is currently {profile.institution.verification_status.replaceAll("_", " ")}.</>}
              icon={<Avatar initials="LL" size="lg" />}
              actions={<ButtonLink href="/listings" variant="secondary">Browse equipment</ButtonLink>}
            >
              <Notice tone="info">
                <strong>Your LabLink information is still saved</strong><br /> Requests, saved listings, and institution details stay in place so access can resume once your institution is verified. 
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
            headingLevel={1}
            eyebrow="Recipient view"
            title={<>Your recipient dashboard is not ready yet.</>}
            lead={<>Finish onboarding and wait for institution verification before using recipient workflows.</>}
            icon={<Avatar initials="LL" size="lg" />}
          />
        </div>
      </section>
    );
  }

  const activeRequests = dashboard.requests.filter((request) =>
    !["completed", "rejected_cancelled"].includes(request.status),
  ).length;
  const totalImpact = dashboard.requests.filter((request) =>
    ["approved_matched", "completed"].includes(request.status),
  ).length;

  return (
    <RecipientDashboardWorkspace
      dashboard={dashboard}
      activeRequests={activeRequests}
      totalImpact={totalImpact}
    />
  );
}
