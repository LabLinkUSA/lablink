import { Avatar, ButtonLink, EmptyState } from "@/components/ui";
import { DonorListingForm } from "@/components/donor-listing-form";
import { getCurrentProfile, getDonorDashboard, getDonorListingDetail, getDonorListingFormTemplates } from "@/lib/api";
import { redirectAdminToDashboard } from "@/lib/role-redirect";

export default async function EditDonorListingPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const [profile, detail, dashboard] = await Promise.all([
    getCurrentProfile(),
    getDonorListingDetail(listingId),
    getDonorDashboard(),
  ]);
  redirectAdminToDashboard(profile);

  if (!profile || profile.user.role !== "donor_lab") {
    return (
      <section className="page-section">
        <div className="shell">
          <EmptyState
            variant="gate"
            headingLevel={1}
            eyebrow="Donor access required"
            title={<>Only donor lab accounts can edit equipment listings.</>}
            lead={<>Sign in with the donor account that owns this listing to continue.</>}
            icon={<Avatar initials="LL" size="lg" />}
            actions={<ButtonLink href="/auth">Sign in / verify</ButtonLink>}
          />
        </div>
      </section>
    );
  }

  const isVerifiedDonor =
    profile.user.account_status === "verified" && profile.institution.verification_status === "verified";

  if (!isVerifiedDonor) {
    return (
      <section className="page-section">
        <div className="shell">
          <EmptyState
            variant="gate"
            headingLevel={1}
            eyebrow="Verification required"
            title={<>Your institution must be admin-verified before you can edit listings.</>}
            lead={<>Once verification is complete, you can come back here to update your donor listings.</>}
            icon={<Avatar initials="LL" size="lg" />}
            actions={<ButtonLink href="/donor" variant="secondary">Back to donor dashboard</ButtonLink>}
          />
        </div>
      </section>
    );
  }

  const listing = detail?.listing ?? dashboard?.listings.find((entry) => entry.id === listingId) ?? null;

  if (!listing) {
    return (
      <section className="page-section">
        <div className="shell">
          <EmptyState
            variant="gate"
            headingLevel={1}
            eyebrow="Listing unavailable"
            title={<>We couldn&apos;t load that donor listing for editing.</>}
            lead={<>The listing may have been removed, or it may no longer belong to your institution.</>}
            icon={<Avatar initials="LL" size="lg" />}
            actions={<ButtonLink href="/donor">Back to donor dashboard</ButtonLink>}
          />
        </div>
      </section>
    );
  }

  const documentTemplates = await getDonorListingFormTemplates(listingId);

  if (!documentTemplates || documentTemplates.templates.length < 2) {
    return (
      <section className="page-section">
        <div className="shell">
          <EmptyState
            variant="gate"
            headingLevel={1}
            eyebrow="PDF templates unavailable"
            title={<>We couldn&apos;t load the donor compliance PDFs.</>}
            lead={<>The listing cannot be edited until the required PDF templates are available.</>}
            icon={<Avatar initials="LL" size="lg" />}
            actions={<ButtonLink href="/donor">Back to donor dashboard</ButtonLink>}
          />
        </div>
      </section>
    );
  }

  const isLiveWithRequests = listing.status === "live" && listing.request_count > 0;

  return (
    <section className="page-section">
      <div className="shell donor-form-page">
        {isLiveWithRequests ? (
          <p className="auth-notice auth-notice-warning" style={{ marginBottom: "1.5rem" }}>
            This listing is live and has active requests. Editing key fields (title, condition, quantity, etc.) will return it to admin review until re-approved.
          </p>
        ) : null}
        <DonorListingForm listing={listing} mode="edit" documentTemplates={documentTemplates.templates} />
      </div>
    </section>
  );
}
