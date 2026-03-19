import Link from "next/link";

import { DonorListingForm } from "@/components/donor-listing-form";
import { getCurrentProfile, getDonorDashboard, getDonorListingDetail } from "@/lib/api";

export default async function EditDonorListingPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const [profile, detail, dashboard] = await Promise.all([
    getCurrentProfile(),
    getDonorListingDetail(listingId),
    getDonorDashboard(),
  ]);

  if (!profile || profile.user.role !== "donor_lab") {
    return (
      <section className="page-section">
        <div className="shell empty-state">
          <span className="eyebrow">Donor access required</span>
          <h1>Only donor lab accounts can edit equipment listings.</h1>
          <p>Sign in with the donor account that owns this listing to continue.</p>
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
          <h1>Your institution must be admin-verified before you can edit listings.</h1>
          <p>Once verification is complete, you can come back here to update your donor listings.</p>
          <div className="page-actions">
            <Link href="/donor" className="button button-secondary">
              Back to donor dashboard
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const listing = detail?.listing ?? dashboard?.listings.find((entry) => entry.id === listingId) ?? null;

  if (!listing) {
    return (
      <section className="page-section">
        <div className="shell empty-state">
          <span className="eyebrow">Listing unavailable</span>
          <h1>We couldn&apos;t load that donor listing for editing.</h1>
          <p>The listing may have been removed, or it may no longer belong to your institution.</p>
          <div className="page-actions">
            <Link href="/donor" className="button button-primary">
              Back to donor dashboard
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
          <span className="eyebrow">Donor listing</span>
          <h1>Edit equipment listing</h1>
          <p>
            Update your listing details here. If the listing is already live, changes will send it back through review
            before it stays publicly available.
          </p>
          <div className="page-actions">
            <Link href="/donor" className="button button-secondary">
              Back to donor dashboard
            </Link>
          </div>
        </div>

        <div className="auth-panel">
          <DonorListingForm listing={listing} mode="edit" />
        </div>
      </div>
    </section>
  );
}
