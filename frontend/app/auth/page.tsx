import { AuthShell } from "@/components/auth-shell";

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
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const reset = getQueryParam(resolvedSearchParams?.reset);
  const initialNotice =
    reset === "success" ? "Password updated successfully. Sign in with your new password." : undefined;

  return <AuthShell initialNotice={initialNotice} />;
}
