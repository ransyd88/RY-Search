import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiError } from "./http";

export async function requireResearchUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false as const, response: apiError(401, "UNAUTHENTICATED", "Please sign in again to continue.") };
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { ok: false as const, response: apiError(401, "UNAUTHENTICATED", "Please sign in again to continue.") };
  }

  return { ok: true as const, supabase, user };
}
