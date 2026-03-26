"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

import { StatusPill } from "@/components/status-pill";
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
const SIGN_IN_ART_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD5SSUKltYoAHKaq2FyIyolZwQ9p0qWnf8sDV97MZ7WyvX8qsnE9Pjf_L2TqKw0pAyxhld01uyXmNYM4lwY7y99TKm4KVF-SJZOHNohGjqlcL2KsmDdWDopomQGq2hGsc7t1jgm4Jz1Z6klbNrzMDqFDIuJf0GufXOL2ak0GmdvlWqev_EWXlEK0w0ttcnChrfwRXGgTAZuU6ISpYPxvsZ-m9E5EK13GJJ-pNsZbYL1YdBeEorLCQZeP8g8v5ZCKo-rcWT5H3ps-GU";

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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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

    if (!acceptedTerms) {
      setError("You must accept the terms and conditions to continue.");
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
  const title = isSignIn ? "Welcome Back" : "Create your account";
  const subtitle = isSignIn
    ? "Access your clinical dashboard and equipment inventory."
    : "Start managing your lab's lifecycle today.";

  return (
    <section className="auth-screen auth-screen-root">
      <div className={`auth-screen-frame${isSignIn ? " auth-screen-frame-signin" : " auth-screen-frame-signup"}`}>
        {isSignIn ? (
          <div className="auth-screen-visual auth-screen-visual-signin">
            <img
              src={SIGN_IN_ART_IMAGE}
              alt="Modern high-tech laboratory with clean white benches, microscope in soft focus, and teal colored scientific equipment lighting"
              className="auth-screen-visual-image"
            />
            <div className="auth-screen-visual-overlay" />
            <div className="auth-screen-visual-copy">
              <div className="auth-screen-badge">Precision connected</div>
              <h2>Powering the next generation of discovery.</h2>
              <p>Manage your laboratory assets and donate critical equipment to research institutions worldwide.</p>
            </div>
          </div>
        ) : (
          <div className="auth-screen-visual auth-screen-visual-signup">
            <div>
              <div className="auth-screen-brand">LabLink</div>
              <h1>
                Empowering Scientific <span>Collaboration.</span>
              </h1>
              <p>
                Join the premier network for laboratory equipment redistribution. Connect with leading institutions to
                ensure every instrument finds its purpose.
              </p>
            </div>
            <div className="auth-screen-feature-list">
              <article className="auth-screen-feature">
                <div className="auth-screen-feature-icon">✓</div>
                <div>
                  <h3>Institutional Verification</h3>
                  <p>Dedicated access for verified research and clinical facilities.</p>
                </div>
              </article>
              <article className="auth-screen-feature">
                <div className="auth-screen-feature-icon">↺</div>
                <div>
                  <h3>Sustainable Logistics</h3>
                  <p>Reducing electronic waste through smart redistribution cycles.</p>
                </div>
              </article>
            </div>
          </div>
        )}

        <div className="auth-screen-panel">
          <div className="auth-screen-panel-inner">
            {isSignIn ? <div className="auth-screen-brand auth-screen-brand-panel">LabLink</div> : null}

            <div className="auth-screen-header">
              <h1>{title}</h1>
              <p>{subtitle}</p>
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
                  {sessionUser.role ? (
                    <Link href={getDashboardHref(sessionUser.role as Role)} className="button button-outline">
                      View dashboard
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : isSignIn ? (
              <form className="auth-screen-form" onSubmit={handleSignInSubmit}>
                <div className="auth-screen-field">
                  <label htmlFor="sign-in-email">Work Email</label>
                  <input
                    id="sign-in-email"
                    type="email"
                    value={signInEmail}
                    onChange={(event) => setSignInEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="scientist@institution.edu"
                    required
                  />
                </div>

                <div className="auth-screen-field">
                  <div className="auth-screen-field-row">
                    <label htmlFor="sign-in-password">Password</label>
                    <Link href="/auth/forgot-password" className="auth-screen-inline-link">
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    id="sign-in-password"
                    type="password"
                    value={signInPassword}
                    onChange={(event) => setSignInPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <label className="auth-screen-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Remember me on this workstation</span>
                </label>

                <button type="submit" className="auth-screen-primary-button" disabled={isPending}>
                  {isPending ? "Signing in..." : "Sign In"}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            ) : (
              <form className="auth-screen-form" onSubmit={handleSignUpSubmit}>
                <div className="auth-screen-field">
                  <label htmlFor="full-name">Full Name</label>
                  <input
                    id="full-name"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                    placeholder="Dr. Julian Vane"
                    required
                  />
                </div>

                <div className="auth-screen-field">
                  <label htmlFor="sign-up-email">Institutional Email</label>
                  <input
                    id="sign-up-email"
                    type="email"
                    value={signUpEmail}
                    onChange={(event) => setSignUpEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="j.vane@university.edu"
                    required
                  />
                </div>

                <div className="auth-screen-field">
                  <label htmlFor="institution-name">Institution Name</label>
                  <input
                    id="institution-name"
                    type="text"
                    value={institutionName}
                    onChange={(event) => setInstitutionName(event.target.value)}
                    placeholder="Biomedical Research Center"
                    required
                  />
                </div>

                <div className="auth-screen-grid">
                  <div className="auth-screen-field">
                    <label htmlFor="sign-up-password">Password</label>
                    <input
                      id="sign-up-password"
                      type="password"
                      value={signUpPassword}
                      onChange={(event) => setSignUpPassword(event.target.value)}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      minLength={8}
                      required
                    />
                  </div>

                  <div className="auth-screen-field">
                    <label htmlFor="confirm-password">Confirm Password</label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                <div className="auth-screen-grid">
                  <div className="auth-screen-field">
                    <label htmlFor="role">Institution Type</label>
                    <select id="role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="auth-screen-field">
                    <label htmlFor="institution-location">Institution Location</label>
                    <input
                      id="institution-location"
                      type="text"
                      value={institutionLocation}
                      onChange={(event) => setInstitutionLocation(event.target.value)}
                      placeholder="City, State"
                      required
                    />
                  </div>
                </div>

                <div className="auth-screen-field">
                  <label htmlFor="institution-description">Institution Description</label>
                  <textarea
                    id="institution-description"
                    value={institutionDescription}
                    onChange={(event) => setInstitutionDescription(event.target.value)}
                    placeholder="Who will use the equipment?"
                    required
                  />
                </div>

                <label className="auth-screen-checkbox auth-screen-checkbox-top">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                  />
                  <span>
                    I agree to the <a href="#">Terms and Conditions</a> and the clinical data usage policy.
                  </span>
                </label>

                <button type="submit" className="auth-screen-primary-button" disabled={isPending}>
                  {isPending ? "Creating account..." : "Create Account"}
                </button>
              </form>
            )}

            {notice ? <p className="auth-notice auth-notice-success">{notice}</p> : null}
            {error ? <p className="auth-notice auth-notice-error">{error}</p> : null}

            <div className="auth-screen-switch">
              {isSignIn ? (
                <>
                  <p>Don&apos;t have an account yet?</p>
                  <Link href="/auth/sign-up" className="auth-screen-switch-link auth-screen-switch-link-pill">
                    Create an account
                  </Link>
                </>
              ) : (
                <p>
                  Already have an account?
                  <Link href="/auth" className="auth-screen-switch-link">
                    Sign in instead
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="auth-screen-footer">
        <div>
          <span>LabLink</span>
          <p>© 2024 LabLink Precision Systems. All rights reserved.</p>
        </div>
        <div className="auth-screen-footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Security Standards</a>
          <a href="#">Contact Support</a>
        </div>
      </footer>
    </section>
  );
}
