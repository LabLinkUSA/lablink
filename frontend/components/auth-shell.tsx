"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

import { StatusPill } from "@/components/status-pill";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { OnboardingCreate, OnboardingResponse, Role } from "@/lib/types";

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

export function AuthShell() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [role, setRole] = useState<Role>("recipient_institution");
  const [institutionName, setInstitutionName] = useState("");
  const [institutionLocation, setInstitutionLocation] = useState("");
  const [institutionDescription, setInstitutionDescription] = useState("");

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

  async function ensureOnboarding(session: Session, options?: { fromSignUp?: boolean }): Promise<void> {
    const payload = buildOnboardingPayload(session.user);
    if (!payload) {
      if (options?.fromSignUp) {
        setNotice("Account created. Finish email confirmation if required, then sign in to complete LabLink onboarding.");
      }
      return;
    }

    const onboarding = await createOnboardingRecord(session.access_token, payload);

    if (onboarding.created) {
      setNotice(
        `Account created and LabLink onboarding started for ${onboarding.institution.name}. Admin verification is still required before transacting.`,
      );
      return;
    }

    if (options?.fromSignUp) {
      setNotice(`Account created. Your LabLink profile for ${onboarding.institution.name} already exists.`);
      return;
    }

    setNotice(`Signed in successfully. Your LabLink profile is linked to ${onboarding.institution.name}.`);
  }

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSessionUser(data.user ? mapSessionUser(data.user) : null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ? mapSessionUser(session.user) : null);
      router.refresh();
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

          if (data.session) {
            await ensureOnboarding(data.session, { fromSignUp: true });
          } else {
            setNotice(
              "Account created. Check your email to confirm your address, then sign in here to finish LabLink onboarding automatically.",
            );
          }

          setMode("sign_in");
          setSignInEmail(signUpEmail);
          setSignInPassword("");
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
        .signOut()
        .then(({ error: authError }) => {
          if (authError) {
            setError(authError.message);
            return;
          }

          setNotice("Signed out.");
          router.refresh();
        })
        .finally(() => {
          setIsPending(false);
        });
    });
  }

  return (
    <section className="page-section">
      <div className="shell">
        <div className="page-header">
          <div>
            <span className="eyebrow">Authentication</span>
            <h1>Sign in now, then move through institution verification.</h1>
            <p>
              Accounts can be created here with Supabase. Posting listings and submitting requests still depend on the
              institution record and admin verification workflow in LabLink.
            </p>
          </div>
        </div>

        <div className="auth-layout">
          <section className="auth-panel">
            <div className="auth-mode-switch" aria-label="Authentication mode">
              <button
                type="button"
                className={mode === "sign_in" ? "auth-mode-button auth-mode-button-active" : "auth-mode-button"}
                onClick={() => {
                  resetMessages();
                  setMode("sign_in");
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                className={mode === "sign_up" ? "auth-mode-button auth-mode-button-active" : "auth-mode-button"}
                onClick={() => {
                  resetMessages();
                  setMode("sign_up");
                }}
              >
                Create account
              </button>
            </div>

            {sessionUser ? (
              <div className="auth-state-card">
                <div className="list-row-topline">
                  <strong>Signed in</strong>
                  <StatusPill status="verified" />
                </div>
                <h2>{sessionUser.email}</h2>
                <p>
                  {sessionUser.role
                    ? `Selected role: ${sessionUser.role.replaceAll("_", " ")}${sessionUser.institutionName ? ` for ${sessionUser.institutionName}.` : "."}`
                    : "Your auth session is active, but your LabLink app profile may still need to be created."}
                </p>
                <div className="auth-actions">
                  <button type="button" className="button button-primary" onClick={handleSignOut} disabled={isPending}>
                    {isPending ? "Working..." : "Sign out"}
                  </button>
                  <Link href="/recipient" className="button button-outline">
                    View recipient flow
                  </Link>
                </div>
              </div>
            ) : mode === "sign_in" ? (
              <form className="auth-form" onSubmit={handleSignInSubmit}>
                <div className="auth-field">
                  <label htmlFor="sign-in-email">Email</label>
                  <input
                    id="sign-in-email"
                    type="email"
                    value={signInEmail}
                    onChange={(event) => setSignInEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="sign-in-password">Password</label>
                  <input
                    id="sign-in-password"
                    type="password"
                    value={signInPassword}
                    onChange={(event) => setSignInPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
                <button type="submit" className="button button-primary auth-submit" disabled={isPending}>
                  {isPending ? "Signing in..." : "Sign in"}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleSignUpSubmit}>
                <div className="auth-field-grid">
                  <div className="auth-field">
                    <label htmlFor="full-name">Full name</label>
                    <input
                      id="full-name"
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="role">Institution type</label>
                    <select id="role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="auth-field-grid">
                  <div className="auth-field">
                    <label htmlFor="sign-up-email">Email</label>
                    <input
                      id="sign-up-email"
                      type="email"
                      value={signUpEmail}
                      onChange={(event) => setSignUpEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="sign-up-password">Password</label>
                    <input
                      id="sign-up-password"
                      type="password"
                      value={signUpPassword}
                      onChange={(event) => setSignUpPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>
                </div>
                <div className="auth-field">
                  <label htmlFor="institution-name">Institution name</label>
                  <input
                    id="institution-name"
                    type="text"
                    value={institutionName}
                    onChange={(event) => setInstitutionName(event.target.value)}
                    required
                  />
                </div>
                <div className="auth-field-grid">
                  <div className="auth-field">
                    <label htmlFor="institution-location">Location</label>
                    <input
                      id="institution-location"
                      type="text"
                      value={institutionLocation}
                      onChange={(event) => setInstitutionLocation(event.target.value)}
                      placeholder="City, State"
                      required
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="institution-description">Institution description</label>
                    <input
                      id="institution-description"
                      type="text"
                      value={institutionDescription}
                      onChange={(event) => setInstitutionDescription(event.target.value)}
                      placeholder="Who will use the equipment?"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="button button-primary auth-submit" disabled={isPending}>
                  {isPending ? "Creating account..." : "Create account"}
                </button>
              </form>
            )}

            {notice ? <p className="auth-notice auth-notice-success">{notice}</p> : null}
            {error ? <p className="auth-notice auth-notice-error">{error}</p> : null}
          </section>

          <div className="auth-grid">
            <article className="auth-card">
              <StatusPill status="pending_verification" />
              <h2>Create an account</h2>
              <p>Choose donor lab or recipient institution, then capture the institution details LabLink will review.</p>
            </article>
            <article className="auth-card">
              <StatusPill status="pending_admin_approval" />
              <h2>App profile mapping</h2>
              <p>
                After signup, the authenticated Supabase user still needs a matching `app_users` row and institution
                record in your LabLink database.
              </p>
            </article>
            <article className="auth-card">
              <StatusPill status="verified" />
              <h2>Admin review</h2>
              <p>Admins approve, reject, suspend, or reactivate institution access before listings or requests go live.</p>
            </article>
            <article className="auth-card">
              <StatusPill status="active" />
              <h2>After verification</h2>
              <p>Once the app profile and institution are ready, authenticated API calls will begin using your session.</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
