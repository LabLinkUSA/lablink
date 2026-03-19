import Link from "next/link";

import { DonorListingForm } from "@/components/donor-listing-form";
import { getCurrentProfile } from "@/lib/api";

export default async function DonorListEquipmentPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <section className="page-section">
        <div className="shell empty-state">
          <span className="eyebrow">Sign in required</span>
          <h1>Sign in with a donor lab account to create an equipment listing.</h1>
          <p>LabLink only allows admin-verified donor institutions to submit listings for review.</p>
          <div className="page-actions">
            <Link href="/auth" className="button button-primary">
              Sign in / verify
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (profile.user.role !== "donor_lab") {
    return (
      <section className="page-section">
        <div className="shell empty-state">
          <span className="eyebrow">Donor access required</span>
          <h1>Only donor lab accounts can create equipment listings.</h1>
          <p>Sign in with a donor account to submit a listing for admin review.</p>
          <div className="page-actions">
            <Link href="/auth" className="button button-primary">
              Sign in / verify
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const isVerifiedDonor =
    profile.user.account_status === "verified" && profile.institution.verification_status === "verified";

  if (!isVerifiedDonor) {
    return (
      <section className="page-section">
        <div className="shell empty-state">
          <span className="eyebrow">Verification required</span>
          <h1>Your institution must be admin-verified before you can list equipment.</h1>
          <p>
            Your donor account is connected to {profile.institution.name}, which is currently{" "}
            {profile.institution.verification_status.replaceAll("_", " ")}.
          </p>
          <div className="auth-state-card">
            <h2>What happens next</h2>
            <p>Once LabLink admin verification is complete, you can return here to submit listings for approval.</p>
          </div>
          <div className="page-actions">
            <Link href="/donor" className="button button-secondary">
              Back to donor dashboard
            </Link>
            <Link href="/auth" className="button button-primary">
              Check verification status
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="shell auth-layout">
        <div className="auth-panel">
          <span className="eyebrow">Donor submission</span>
          <h1>List equipment for admin approval</h1>
          <p>
            New donor listings stay in a pending state until an admin reviews them. Pending listings remain visible only
            in the donor dashboard and admin panel.
          </p>
          <div className="auth-state-card">
            <h2>Before you submit</h2>
            <p>Include a clear photo, accurate condition notes, handling requirements, and delivery constraints.</p>
          </div>
        </div>

        <div className="auth-panel">
          <DonorListingForm mode="create" />
        </div>
      </div>
    </section>
  );
}
