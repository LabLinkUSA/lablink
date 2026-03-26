"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

function getUrlMessage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const errorDescription = searchParams.get("error_description") ?? hashParams.get("error_description");

  return errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, " ")) : null;
}

export function UpdatePasswordShell() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const urlMessage = getUrlMessage();
    if (urlMessage && isMounted) {
      setError(urlMessage);
      setIsCheckingRecovery(false);
    }

    void supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!isMounted) {
          return;
        }

        if (sessionError) {
          setError(sessionError.message);
          setIsCheckingRecovery(false);
          return;
        }

        setIsRecoveryReady(Boolean(data.session));
        setIsCheckingRecovery(false);
      })
      .catch((sessionError: unknown) => {
        if (!isMounted) {
          return;
        }

        setError(sessionError instanceof Error ? sessionError.message : "Could not verify the reset link.");
        setIsCheckingRecovery(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setIsRecoveryReady(Boolean(session));
        setError(null);
        setIsCheckingRecovery(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setError(null);

    if (password.length < 8) {
      setError("Your new password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsPending(true);

    startTransition(() => {
      void supabase.auth
        .updateUser({ password })
        .then(async ({ error: authError }) => {
          if (authError) {
            setError(authError.message);
            return;
          }

          setNotice("Password updated. Redirecting you back to sign in.");
          await supabase.auth.signOut({ scope: "local" });
          router.push("/auth?reset=success");
          router.refresh();
        })
        .catch((updateError: unknown) => {
          setError(updateError instanceof Error ? updateError.message : "Could not update your password.");
        })
        .finally(() => {
          setIsPending(false);
        });
    });
  }

  const showRecoveryError = !isCheckingRecovery && !isRecoveryReady;

  return (
    <section className="page-section">
      <div className="shell">
        <div className="page-header">
          <div>
            <span className="eyebrow">Password reset</span>
            <h1>Choose a new password.</h1>
            <p>
              Use the secure recovery session from your reset email to set a fresh password for your LabLink account.
            </p>
          </div>
        </div>

        <div className="auth-layout auth-layout-single">
          <section className="auth-panel">
            {isCheckingRecovery ? (
              <p className="auth-notice auth-notice-success">Checking your reset link...</p>
            ) : showRecoveryError ? (
              <>
                <p className="auth-notice auth-notice-error">
                  {error ?? "This reset link is invalid, expired, or has already been used."}
                </p>
                <div className="auth-actions">
                  <Link href="/auth/forgot-password" className="button button-primary">
                    Request a new reset link
                  </Link>
                  <Link href="/auth" className="button button-outline">
                    Back to sign in
                  </Link>
                  <Link href="/auth/sign-up" className="button button-secondary">
                    Create account
                  </Link>
                </div>
              </>
            ) : (
              <>
                <form className="auth-form" onSubmit={handleSubmit}>
                  <div className="auth-field">
                    <label htmlFor="new-password">New password</label>
                    <input
                      id="new-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="confirm-password">Confirm new password</label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>
                  <button type="submit" className="button button-primary auth-submit" disabled={isPending}>
                    {isPending ? "Updating password..." : "Update password"}
                  </button>
                </form>

                {notice ? <p className="auth-notice auth-notice-success">{notice}</p> : null}
                {error ? <p className="auth-notice auth-notice-error">{error}</p> : null}
              </>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
