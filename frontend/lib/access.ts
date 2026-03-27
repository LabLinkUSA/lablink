import type { AuthenticatedUser } from "@/lib/types";

export function isApprovedRecipient(profile: AuthenticatedUser | null): boolean {
  return (
    profile?.user.role === "recipient_institution" &&
    profile.user.account_status === "verified" &&
    profile.institution.verification_status === "verified"
  );
}
