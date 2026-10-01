import { Avatar, ButtonLink, EmptyState, Notice } from "@/components/ui";
import { DonorListingForm } from "@/components/donor-listing-form";
import { getCurrentProfile, getDonorListingDetail, getDonorListingFormTemplates } from "@/lib/api";
import { redirectAdminToDashboard } from "@/lib/role-redirect";
import type { Listing } from "@/lib/types";

const EMPTY_CREATE_LISTING: Listing = {
  id: "",
  title: "",
  category: "",
  condition: "",
  quantity: 1,
  location: "",
  availability_window: "",
  description: "",
  dimensions_weight: "",
  handling_requirements: "",
  working_status: "",
  documentation_included: "",
  special_handling_flags: "",
  delivery_mode: "pickup_only",
  status: "draft",
  photo_urls: [],
  donor_institution_id: "",
  created_by_user_id: "",
  created_at: "",
  request_count: 0,
};

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
        <div className="shell">
          <EmptyState
            variant="gate"
            headingLevel={1}
            eyebrow="Sign in required"
            title={<>Sign in with a donor lab account to create an equipment listing.</>}
            lead={<>LabLink only allows admin-verified donor institutions to submit listings for review.</>}
            icon={<Avatar initials="LL" size="lg" />}
            actions={<ButtonLink href="/auth">Sign in / verify</ButtonLink>}
          />
        </div>
      </section>
    );
  }

  if (profile.user.role !== "donor_lab") {
    return (
      <section className="page-section">
        <div className="shell">
          <EmptyState
            variant="gate"
            headingLevel={1}
            eyebrow="Donor access required"
            title={<>Only donor lab accounts can create equipment listings.</>}
            lead={<>Sign in with a donor account to submit a listing for admin review.</>}
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
            title={<>Your institution must be admin-verified before you can list equipment.</>}
            lead={<>Your donor account is connected to {profile.institution.name}, which is currently{" "} {profile.institution.verification_status.replaceAll("_", " ")}.</>}
            icon={<Avatar initials="LL" size="lg" />}
            actions={
              <>
                <ButtonLink href="/donor" variant="secondary">Back to donor dashboard</ButtonLink>
                <ButtonLink href="/auth">Check verification status</ButtonLink>
              </>
            }
          >
            <Notice tone="info">
              <strong>What happens next</strong><br />Once LabLink admin verification is complete, you can return here to submit listings for approval.
            </Notice>
          </EmptyState>
        </div>
      </section>
    );
  }

  if (!draft) {
    return (
      <section className="page-section">
        <div className="shell donor-form-page">
          <DonorListingForm mode="create" listing={EMPTY_CREATE_LISTING} documentTemplates={[]} />
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
        <div className="shell">
          <EmptyState
            variant="gate"
            headingLevel={1}
            eyebrow="Draft unavailable"
            title={<>We couldn&apos;t load the draft listing workflow.</>}
            lead={<>The draft listing or required PDF templates could not be loaded.</>}
            icon={<Avatar initials="LL" size="lg" />}
            actions={<ButtonLink href="/donor" variant="secondary">Back to donor dashboard</ButtonLink>}
          />
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
