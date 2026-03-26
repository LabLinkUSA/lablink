import { AuthShell } from "@/components/auth-shell";
import { getCurrentProfile } from "@/lib/api";
import { redirectAdminToDashboard } from "@/lib/role-redirect";

export default async function SignUpPage() {
  const profile = await getCurrentProfile();
  redirectAdminToDashboard(profile);

  return <AuthShell mode="sign_up" />;
}
