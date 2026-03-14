import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAccessToken(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}
