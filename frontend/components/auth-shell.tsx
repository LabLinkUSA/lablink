"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

import { AuthSplit } from "@/components/auth/auth-split";
import styles from "@/components/auth/auth-split.module.css";
import { StatusPill } from "@/components/status-pill";
import { Button, ButtonLink, Checkbox, EmptyState, Eyebrow, Field, FieldGrid, Input, Notice, Select, Textarea } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AuthenticatedUser, OnboardingCreate, OnboardingResponse, Role } from "@/lib/types";

type AuthMode = "sign_in" | "sign_up";

type SessionUser = {
  email?: string;
  role?: string;
  institutionName?: string;
  onboardingReady?: boolean;
};

const roleOptions: Array<{ value: Role; label: string }> = [
  { value: "donor_lab", label: "Donor lab" },
  { value: "recipient_institution", label: "Recipient institution" },
];

const supabase = createSupabaseBrowserClient();
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
function isInvalidRefreshTokenMessage(message: string): boolean {
  return message.includes("Invalid Refresh Token") || message.includes("Refresh Token Not Found");
}

function getFriendlyAuthErrorMessage(message: string): string {
  if (message.toLowerCase().includes("email not confirmed")) {
    return "Check your email inbox to confirm and verify your account before signing in.";
  }

  return message;
}

function getDashboardHref(role?: Role): string {
  if (role === "donor_lab") {
    return "/donor";
  }
  if (role === "recipient_institution") {
    return "/recipient";
  }
  if (role === "admin") {
    return "/admin";
  }
  return "/auth";
}

type AuthShellProps = {
  mode: AuthMode;
  initialNotice?: string;
};

export function AuthShell({ mode, initialNotice }: AuthShellProps) {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(initialNotice ?? null);
  const [error, setError] = useState<string | null>(null);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [fullName, setFullName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("recipient_institution");
  const [institutionName, setInstitutionName] = useState("");
  const [institutionLocation, setInstitutionLocation] = useState("");
  const [institutionDescription, setInstitutionDescription] = useState("");

  useEffect(() => {
    setNotice(initialNotice ?? null);
  }, [initialNotice]);

  async function clearInvalidSession() {
    await supabase.auth.signOut({ scope: "local" });
    setSessionUser(null);
  }

  function getMetadataValue(user: SupabaseUser, key: string): string | undefined {
    const value = user.user_metadata[key];
    return typeof value === "string" ? value : undefined;
  }

  function buildOnboardingPayload(user: SupabaseUser): OnboardingCreate | null {
    const roleValue = getMetadataValue(user, "role");
    const institutionNameValue = getMetadataValue(user, "institution_name");
    const institutionLocationValue = getMetadataValue(user, "institution_location");
    const institutionDescriptionValue = getMetadataValue(user, "institution_description");
    const fullNameValue =
      getMetadataValue(user, "full_name") ??
      getMetadataValue(user, "name") ??
      user.email?.split("@")[0];

    if (
      !fullNameValue ||
      !roleValue ||
      (roleValue !== "donor_lab" && roleValue !== "recipient_institution") ||
      !institutionNameValue ||
      !institutionLocationValue ||
      !institutionDescriptionValue
    ) {
      return null;
    }

    return {
      full_name: fullNameValue,
      role: roleValue,
      institution_name: institutionNameValue,
      institution_location: institutionLocationValue,
      institution_description: institutionDescriptionValue,
    };
  }

  function mapSessionUser(user: SupabaseUser): SessionUser {
    return {
      email: user.email,
      role: getMetadataValue(user, "role"),
      institutionName: getMetadataValue(user, "institution_name"),
      onboardingReady: Boolean(buildOnboardingPayload(user)),
    };
  }

  function isDuplicateEmailSignUp(user: SupabaseUser | null): boolean {
    if (!user) {
      return false;
    }

    return Array.isArray(user.identities) && user.identities.length === 0;
  }

  async function createOnboardingRecord(accessToken: string, payload: OnboardingCreate): Promise<OnboardingResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/onboarding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message = "Could not create your LabLink profile.";
      try {
        const body = (await response.json()) as { detail?: string };
        if (body.detail) {
          message = body.detail;
        }
      } catch {}
      throw new Error(message);
    }

    return (await response.json()) as OnboardingResponse;
  }

  async function fetchCurrentProfile(accessToken: string): Promise<AuthenticatedUser | null> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      let message = "Could not load your LabLink profile.";
      try {
        const body = (await response.json()) as { detail?: string };
        if (body.detail) {
          message = body.detail;
        }
      } catch {}
      throw new Error(message);
    }

    return (await response.json()) as AuthenticatedUser;
  }

  async function lookupAppAccount(email: string): Promise<{ exists: boolean; appExists: boolean; authExists: boolean } | null> {
    const response = await fetch(`${API_BASE_URL}/auth/account-exists?email=${encodeURIComponent(email)}`);

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { exists: boolean; app_exists?: boolean; auth_exists?: boolean };
    return {
      exists: body.exists,
      appExists: Boolean(body.app_exists),
      authExists: Boolean(body.auth_exists),
    };
  }

  async function routeToDashboard(roleValue: Role) {
    window.location.replace(getDashboardHref(roleValue));
  }

  function refreshPage() {
    router.refresh();
  }

  async function ensureOnboarding(session: Session, options?: { fromSignUp?: boolean }): Promise<void> {
    const payload = buildOnboardingPayload(session.user);
    if (!payload) {
      if (options?.fromSignUp) {
        setNotice("Account created. Finish email confirmation if required, then sign in to complete LabLink onboarding.");
        return;
      }

      const profile = await fetchCurrentProfile(session.access_token);
      if (!profile) {
        setNotice("Signed in successfully, but this account is not provisioned for LabLink access yet.");
        return;
      }

      setNotice(`Signed in successfully. Your LabLink profile is linked to ${profile.institution.name}.`);
      await routeToDashboard(profile.user.role);
      return;
    }

    const onboarding = await createOnboardingRecord(session.access_token, payload);

    if (onboarding.created) {
      setNotice(
        `Account created and LabLink onboarding started for ${onboarding.institution.name}. Admin verification is still required before transacting.`,
      );
      refreshPage();
      return;
    }

    if (options?.fromSignUp) {
      setNotice(`Account created. Your LabLink profile for ${onboarding.institution.name} already exists.`);
      refreshPage();
      return;
    }

    setNotice(`Signed in successfully. Your LabLink profile is linked to ${onboarding.institution.name}.`);
    await routeToDashboard(onboarding.user.role);
  }

  useEffect(() => {
    let isMounted = true;

    void supabase.auth
      .getUser()
      .then(async ({ data, error: authError }) => {
        if (!isMounted) {
          return;
        }

        if (authError) {
          if (isInvalidRefreshTokenMessage(authError.message)) {
            await clearInvalidSession();
            return;
          }

          setSessionUser(null);
          return;
        }

        setSessionUser(data.user ? mapSessionUser(data.user) : null);
      })
      .catch(async (authError: unknown) => {
        if (!isMounted) {
          return;
        }

        if (authError instanceof Error && isInvalidRefreshTokenMessage(authError.message)) {
          await clearInvalidSession();
          return;
        }

        setSessionUser(null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setSessionUser(null);
        return;
      }

      setSessionUser(session?.user ? mapSessionUser(session.user) : null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  function resetMessages() {
    setNotice(null);
    setError(null);
  }

  function handleSignInSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setIsPending(true);

    startTransition(() => {
      void supabase.auth
        .signInWithPassword({
          email: signInEmail,
          password: signInPassword,
        })
        .then(async ({ error: authError, data }) => {
          if (authError) {
            const friendlyMessage = getFriendlyAuthErrorMessage(authError.message);
            if (friendlyMessage !== authError.message) {
              setError(friendlyMessage);
              return;
            }

            if (authError.message.toLowerCase().includes("invalid login credentials")) {
              const accountExists = await lookupAppAccount(signInEmail);
              if (accountExists && !accountExists.exists) {
                setError("We couldn't find a LabLink account for that email address.");
                return;
              }

              if (accountExists?.exists) {
                setError("The password you entered is incorrect. Try again.");
                return;
              }
            }

            setError(authError.message);
            return;
          }

          if (!data.session) {
            setNotice("Signed in successfully.");
            return;
          }

          await ensureOnboarding(data.session);
        })
        .catch((signInError: unknown) => {
          setError(signInError instanceof Error ? signInError.message : "Could not complete sign-in.");
        })
        .finally(() => {
          setIsPending(false);
        });
    });
  }

  function handleSignUpSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (signUpPassword.length < 8) {
      setError("Your password must be at least 8 characters long.");
      return;
    }

    if (signUpPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsPending(true);

    startTransition(() => {
      void supabase.auth
        .signUp({
          email: signUpEmail,
          password: signUpPassword,
          options: {
            data: {
              full_name: fullName,
              role,
              institution_name: institutionName,
              institution_location: institutionLocation,
              institution_description: institutionDescription,
            },
          },
        })
        .then(async ({ error: authError, data }) => {
          if (authError) {
            setError(authError.message);
            return;
          }

          if (isDuplicateEmailSignUp(data.user)) {
            setError("That email is already associated with an account. Sign in instead or reset the password.");
            return;
          }

          if (data.session) {
            await ensureOnboarding(data.session, { fromSignUp: true });
          } else {
            setNotice(
              "Account created. Check your email to confirm your address, then sign in here to finish LabLink onboarding automatically.",
            );
          }
        })
        .catch((signUpError: unknown) => {
          setError(signUpError instanceof Error ? signUpError.message : "Could not complete sign-up.");
        })
        .finally(() => {
          setIsPending(false);
        });
    });
  }

  function handleSignOut() {
    resetMessages();
    setIsPending(true);

    startTransition(() => {
      void supabase.auth
        .signOut({ scope: "local" })
        .then(({ error: authError }) => {
          if (authError) {
            setError(authError.message);
            return;
          }

          window.location.replace("/");
        })
        .finally(() => {
          setIsPending(false);
        });
    });
  }

  const isSignIn = mode === "sign_in";
  const shouldHideSignedInState = isSignIn && sessionUser !== null;
  const title = isSignIn ? "Welcome Back" : "Create your account";
  const subtitle = isSignIn ? "Access your clinical dashboard and equipment inventory." : "";

  const aside = isSignIn ? (
    <>
      <Eyebrow variant="badge">Yale-founded · Student-run · Nonprofit</Eyebrow>
      <h2 className={styles.asideTitle}>
        Welcome <em>back.</em>
      </h2>
      <p className={styles.asideLead}>
        Manage your laboratory assets and donate critical equipment to research institutions worldwide.
      </p>
    </>
  ) : (
    <>
      <Eyebrow variant="badge">Yale-founded · Student-run · Nonprofit</Eyebrow>
      <h2 className={styles.asideTitle}>
        Join the <em>LabLink network.</em>
      </h2>
      <div className={styles.features}>
        <article className={styles.feature}>
          <div className={styles.featureStep}>01 · Verify</div>
          <h3>Institutional Verification</h3>
          <p>Dedicated access for verified research and clinical facilities.</p>
        </article>
        <article className={styles.feature}>
          <div className={styles.featureStep}>02 · Match</div>
          <h3>Sustainable Logistics</h3>
          <p>Reducing electronic waste through smart redistribution cycles.</p>
        </article>
      </div>
    </>
  );

  const card = (
    <>
      <div className={styles.cardHeader}>
        <h1 className={styles.cardTitle}>{title}</h1>
        {subtitle ? <p className={styles.cardLead}>{subtitle}</p> : null}
      </div>

      {shouldHideSignedInState ? null : sessionUser ? (
        <EmptyState
          variant="gate"
          eyebrow={<StatusPill status="verified" />}
          title={sessionUser.email}
          lead={
            sessionUser.role
              ? `Selected role: ${sessionUser.role.replaceAll("_", " ")}${sessionUser.institutionName ? ` for ${sessionUser.institutionName}.` : "."}`
              : "Your auth session is active, but your LabLink app profile may still need to be created."
          }
          actions={
            <>
              <Button type="button" onClick={handleSignOut} disabled={isPending}>
                {isPending ? "Working..." : "Sign out"}
              </Button>
              {sessionUser.role ? (
                <ButtonLink href={getDashboardHref(sessionUser.role as Role)} variant="secondary">
                  View dashboard
                </ButtonLink>
              ) : null}
            </>
          }
        />
      ) : isSignIn ? (
        <form className={styles.form} onSubmit={handleSignInSubmit}>
          <Field label="Work Email" htmlFor="sign-in-email">
            <Input
              id="sign-in-email"
              type="email"
              value={signInEmail}
              onChange={(event) => setSignInEmail(event.target.value)}
              autoComplete="email"
              placeholder="scientist@institution.edu"
              required
            />
          </Field>

          <Field
            label="Password"
            htmlFor="sign-in-password"
            hint={
              <ButtonLink href="/auth/forgot-password" variant="ghost" size="sm">
                Forgot password?
              </ButtonLink>
            }
          >
            <Input
              id="sign-in-password"
              type="password"
              value={signInPassword}
              onChange={(event) => setSignInPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </Field>

          <Checkbox
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            label="Remember me on this workstation"
          />

          <Button type="submit" size="lg" block arrow className="auth-screen-primary-button" disabled={isPending}>
            {isPending ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      ) : (
        <form className={styles.form} onSubmit={handleSignUpSubmit}>
          <Field label="Full Name" htmlFor="full-name">
            <Input
              id="full-name"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              placeholder="Dr. Julian Vane"
              required
            />
          </Field>

          <Field label="Institutional Email" htmlFor="sign-up-email">
            <Input
              id="sign-up-email"
              type="email"
              value={signUpEmail}
              onChange={(event) => setSignUpEmail(event.target.value)}
              autoComplete="email"
              placeholder="j.vane@university.edu"
              required
            />
          </Field>

          <Field label="Institution Name" htmlFor="institution-name">
            <Input
              id="institution-name"
              type="text"
              value={institutionName}
              onChange={(event) => setInstitutionName(event.target.value)}
              placeholder="Biomedical Research Center"
              required
            />
          </Field>

          <FieldGrid>
            <Field label="Password" htmlFor="sign-up-password">
              <Input
                id="sign-up-password"
                type="password"
                value={signUpPassword}
                onChange={(event) => setSignUpPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                minLength={8}
                required
              />
            </Field>

            <Field label="Confirm Password" htmlFor="confirm-password">
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                minLength={8}
                required
              />
            </Field>
          </FieldGrid>

          <FieldGrid>
            <Field label="Institution Type" htmlFor="role">
              <Select id="role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Institution Location" htmlFor="institution-location">
              <Input
                id="institution-location"
                type="text"
                value={institutionLocation}
                onChange={(event) => setInstitutionLocation(event.target.value)}
                placeholder="City, State"
                required
              />
            </Field>
          </FieldGrid>

          <Field label="Institution Description" htmlFor="institution-description">
            <Textarea
              id="institution-description"
              value={institutionDescription}
              onChange={(event) => setInstitutionDescription(event.target.value)}
              placeholder="Who will use the equipment?"
              required
            />
          </Field>

          <Button type="submit" size="lg" block arrow className="auth-screen-primary-button" disabled={isPending}>
            {isPending ? "Creating account…" : "Create Account"}
          </Button>
        </form>
      )}

      {notice || error ? (
        <div className={styles.messages}>
          {notice ? <Notice tone="success">{notice}</Notice> : null}
          {error ? <Notice tone="error">{error}</Notice> : null}
        </div>
      ) : null}

      <div className={styles.switch}>
        {isSignIn ? (
          <>
            <p>Don&apos;t have an account yet?</p>
            <ButtonLink href="/auth/sign-up" variant="secondary">
              Create an account
            </ButtonLink>
          </>
        ) : (
          <>
            <p>Already have an account?</p>
            <ButtonLink href="/auth" variant="secondary">
              Sign in instead
            </ButtonLink>
          </>
        )}
      </div>
    </>
  );

  return <AuthSplit aside={aside} card={card} />;
}
