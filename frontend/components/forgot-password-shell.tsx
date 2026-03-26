"use client";

import Link from "next/link";
import { startTransition, useState } from "react";

import { createSupabaseBrowserClient, getBrowserRedirectUrl } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

export function ForgotPasswordShell() {
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setNotice(null);
    setError(null);

    startTransition(() => {
      void supabase.auth
        .resetPasswordForEmail(email, {
          redirectTo: getBrowserRedirectUrl("/auth/update-password"),
        })
        .then(({ error: authError }) => {
          if (authError) {
            setError(authError.message);
            return;
          }

          setNotice("If an account exists for this email, we sent a password reset link.");
        })
        .catch((resetError: unknown) => {
          setError(resetError instanceof Error ? resetError.message : "Could not send the password reset email.");
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
            <span className="eyebrow">Password reset</span>
            <h1>Request a secure reset link.</h1>
            <p>
              Enter the email address tied to your LabLink account. If it exists, Supabase will send a password reset
              link to that inbox.
            </p>
          </div>
        </div>

        <div className="auth-layout auth-layout-single">
          <section className="auth-panel">
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="reset-email">Email</label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <button type="submit" className="button button-primary auth-submit" disabled={isPending}>
                {isPending ? "Sending reset link..." : "Send reset link"}
              </button>
            </form>

            {notice ? <p className="auth-notice auth-notice-success">{notice}</p> : null}
            {error ? <p className="auth-notice auth-notice-error">{error}</p> : null}

            <div className="auth-actions">
              <Link href="/auth" className="button button-outline">
                Back to sign in
              </Link>
              <Link href="/auth/sign-up" className="button button-secondary">
                Create account
              </Link>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
