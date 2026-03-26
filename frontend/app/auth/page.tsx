import { AuthShell } from "@/components/auth-shell";
import { getCurrentProfile } from "@/lib/api";
import { redirectAdminToDashboard } from "@/lib/role-redirect";

type AuthPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getQueryParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const [resolvedSearchParams, profile] = await Promise.all([searchParams ? searchParams : undefined, getCurrentProfile()]);
  redirectAdminToDashboard(profile);
  const reset = getQueryParam(resolvedSearchParams?.reset);
  const initialNotice =
    reset === "success" ? "Password updated successfully. Sign in with your new password." : undefined;

  return <AuthShell mode="sign_in" initialNotice={initialNotice} />;
}
