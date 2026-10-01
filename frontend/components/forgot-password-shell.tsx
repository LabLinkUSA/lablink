"use client";

import { startTransition, useState } from "react";

import { CenteredCard } from "@/components/auth/centered-card";
import { Button, ButtonLink, Field, Input, Notice, PageHeader } from "@/components/ui";
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
    <CenteredCard>
      <PageHeader
        variant="operate"
        eyebrow="Password reset"
        title="Request a secure reset link."
        lead="Enter the email address tied to your LabLink account. If it exists, LabLink will send a password reset link to that inbox."
      />

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
        <Field label="Email" htmlFor="reset-email" required>
          <Input
            id="reset-email"
            type="email"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </Field>

        <Button type="submit" block size="lg" disabled={isPending}>
          {isPending ? "Sending reset link…" : "Send reset link"}
        </Button>
      </form>

      {notice ? <Notice tone="success">{notice}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <ButtonLink href="/auth" variant="secondary">
          Back to sign in
        </ButtonLink>
        <ButtonLink href="/auth/sign-up" variant="ghost">
          Create account
        </ButtonLink>
      </div>
    </CenteredCard>
  );
}
