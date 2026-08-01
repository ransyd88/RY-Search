import { createClient } from "@supabase/supabase-js";
import { readServerEnv } from "@/lib/server-env";

/**
 * Server-only Supabase client for trusted usage-counter RPCs.
 * Never import this module from a Client Component.
 */
export async function createSupabaseAdminClient() {
  const url = await readServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = await readServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
