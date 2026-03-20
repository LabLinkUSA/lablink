import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function getErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  }

  return null;
}

function isInvalidRefreshTokenError(error: unknown): boolean {
  const message = getErrorMessage(error);
  if (!message) {
    return false;
  }

  return message.includes("Invalid Refresh Token") || message.includes("Refresh Token Not Found");
}

export const getAccessToken = cache(async (): Promise<string | null> => {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token ?? null;
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      return null;
    }

    throw error;
  }
});
