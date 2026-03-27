import Link from "next/link";
import { redirect } from "next/navigation";

import { DonorListingForm } from "@/components/donor-listing-form";
import { createDonorListingDraft, getCurrentProfile, getDonorListingDetail, getDonorListingFormTemplates } from "@/lib/api";
import { redirectAdminToDashboard } from "@/lib/role-redirect";

export default async function DonorListEquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const profile = await getCurrentProfile();
  redirectAdminToDashboard(profile);
  const { draft } = await searchParams;

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

  if (!draft) {
    const draftListing = await createDonorListingDraft();
    if (draftListing) {
      redirect(`/donor/list-equipment?draft=${draftListing.id}`);
    }
  }

  if (!draft) {
    return (
      <section className="page-section">
        <div className="shell empty-state">
          <span className="eyebrow">Draft unavailable</span>
          <h1>We couldn&apos;t start a draft equipment listing.</h1>
          <p>Try again in a moment. LabLink could not provision the draft listing needed for this workflow.</p>
          <div className="page-actions">
            <Link href="/donor" className="button button-secondary">
              Back to donor dashboard
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const [detail, documentTemplates] = await Promise.all([
    getDonorListingDetail(draft),
    getDonorListingFormTemplates(draft),
  ]);

  if (!detail || !documentTemplates || detail.listing.status !== "draft" || documentTemplates.templates.length < 2) {
    return (
      <section className="page-section">
        <div className="shell empty-state">
          <span className="eyebrow">Draft unavailable</span>
          <h1>We couldn&apos;t load the draft listing workflow.</h1>
          <p>The draft listing or required PDF templates could not be loaded.</p>
          <div className="page-actions">
            <Link href="/donor" className="button button-secondary">
              Back to donor dashboard
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="shell donor-form-page">
        <DonorListingForm mode="create" listing={detail.listing} documentTemplates={documentTemplates.templates} />
      </div>
    </section>
  );
}
