// Temporary: the public site runs as a brochure while sign-in / sign-up are paused.
// Flip AUTH_ENABLED back to true to restore the /auth flow and all auth CTAs.
export const AUTH_ENABLED = false;

export const CONTACT_EMAIL = "lablinkusa@gmail.com";

export function contactHref(subject?: string): string {
  return subject ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}` : `mailto:${CONTACT_EMAIL}`;
}

/** Where an auth call-to-action should point: /auth when enabled, otherwise an email to LabLink. */
export function authCtaHref(subject: string): string {
  return AUTH_ENABLED ? "/auth" : contactHref(subject);
}
