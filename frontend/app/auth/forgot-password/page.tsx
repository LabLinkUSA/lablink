import { ForgotPasswordShell } from "@/components/forgot-password-shell";
import { getCurrentProfile } from "@/lib/api";
import { redirectAdminToDashboard } from "@/lib/role-redirect";

export default async function ForgotPasswordPage() {
  const profile = await getCurrentProfile();
  redirectAdminToDashboard(profile);

  return <ForgotPasswordShell />;
}
