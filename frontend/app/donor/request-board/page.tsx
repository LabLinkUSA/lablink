import { Avatar, ButtonLink, EmptyState } from "@/components/ui";
import { RequestBoardBrowser } from "@/components/request-board-browser";
import { getCurrentProfile } from "@/lib/api";
import { redirectAdminToDashboard } from "@/lib/role-redirect";

export default async function DonorRequestBoardPage() {
  const profile = await getCurrentProfile();
  redirectAdminToDashboard(profile);

  if (!profile || profile.user.role !== "donor_lab") {
    return (
      <section className="page-section">
        <div className="shell">
          <EmptyState
            variant="gate"
            headingLevel={1}
            eyebrow="Donor access required"
            title={<>Sign in with a donor lab account to browse the request board.</>}
            lead={<>The request board shows open equipment requests from verified recipient institutions.</>}
            icon={<Avatar initials="LL" size="lg" />}
            actions={<ButtonLink href="/auth">Sign in / verify</ButtonLink>}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="shell">
        <div className="page-header">
          <span className="eyebrow">Donor workspace</span>
          <h1>Recipient Request Board</h1>
          <p className="page-intro">
            Browse open equipment requests from recipient institutions. Respond by creating a linked listing to signal
            your intent to donate.
          </p>
        </div>
        <RequestBoardBrowser />
      </div>
    </section>
  );
}
