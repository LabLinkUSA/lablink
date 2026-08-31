import Link from "next/link";

import { RequestBoardBrowser } from "@/components/request-board-browser";
import { getCurrentProfile } from "@/lib/api";
import { redirectAdminToDashboard } from "@/lib/role-redirect";

export default async function DonorRequestBoardPage() {
  const profile = await getCurrentProfile();
  redirectAdminToDashboard(profile);

  if (!profile || profile.user.role !== "donor_lab") {
    return (
      <section className="page-section">
        <div className="shell empty-state">
          <span className="eyebrow">Donor access required</span>
          <h1>Sign in with a donor lab account to browse the request board.</h1>
          <p>The request board shows open equipment requests from verified recipient institutions.</p>
          <div className="page-actions">
            <Link href="/auth" className="button button-primary">
              Sign in / verify
            </Link>
          </div>
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
