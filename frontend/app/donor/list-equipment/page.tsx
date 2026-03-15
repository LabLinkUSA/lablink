import Link from "next/link";

import { DonorListingForm } from "@/components/donor-listing-form";
import { getCurrentProfile } from "@/lib/api";

export default async function DonorListEquipmentPage() {
  const profile = await getCurrentProfile();

  if (profile?.user.role !== "donor_lab") {
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
          <DonorListingForm />
        </div>
      </div>
    </section>
  );
}
