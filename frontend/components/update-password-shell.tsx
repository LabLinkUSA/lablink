"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CenteredCard } from "@/components/auth/centered-card";
import { Button, ButtonLink, Field, Input, Notice, PageHeader } from "@/components/ui";
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
    <CenteredCard>
      <PageHeader
        variant="operate"
        eyebrow="Password reset"
        title="Choose a new password."
        lead="Use the secure recovery session from your reset email to set a fresh password for your LabLink account."
      />

      {isCheckingRecovery ? (
        <Notice tone="info">Checking your reset link…</Notice>
      ) : showRecoveryError ? (
        <>
          <Notice tone="error">{error ?? "This reset link is invalid, expired, or has already been used."}</Notice>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <ButtonLink href="/auth/forgot-password">Request a new reset link</ButtonLink>
            <ButtonLink href="/auth" variant="secondary">
              Back to sign in
            </ButtonLink>
            <ButtonLink href="/auth/sign-up" variant="ghost">
              Create account
            </ButtonLink>
          </div>
        </>
      ) : (
        <>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
            <Field label="New password" htmlFor="new-password" required>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
            <Field label="Confirm new password" htmlFor="confirm-password" required>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
            <Button type="submit" block size="lg" disabled={isPending}>
              {isPending ? "Updating password…" : "Update password"}
            </Button>
          </form>

          {notice ? <Notice tone="success">{notice}</Notice> : null}
          {error ? <Notice tone="error">{error}</Notice> : null}
        </>
      )}
    </CenteredCard>
  );
}
