import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;
let recoveryInstalled = false;

function isInvalidRefreshTokenError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes("Invalid Refresh Token") || error.message.includes("Refresh Token Not Found");
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string"
      ? message.includes("Invalid Refresh Token") || message.includes("Refresh Token Not Found")
      : false;
  }

  return false;
}

function installRecovery(client: SupabaseClient) {
  if (recoveryInstalled || typeof window === "undefined") {
    return;
  }

  recoveryInstalled = true;

  const clearBrokenSession = () => {
    void client.auth.signOut({ scope: "local" });
  };

  client.auth.onAuthStateChange((event) => {
    if (event === "TOKEN_REFRESH_FAILED") {
      clearBrokenSession();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (!isInvalidRefreshTokenError(event.reason)) {
      return;
    }

    event.preventDefault();
    clearBrokenSession();
  });
}

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  if (!browserClient) {
    browserClient = createBrowserClient(url, anonKey);
  }

  installRecovery(browserClient);

  return browserClient;
}

export function getBrowserRedirectUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin =
    typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return new URL(normalizedPath, origin).toString();
}
