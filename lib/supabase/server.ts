import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "./config";
import {
  AUTH_PERSISTENCE_COOKIE,
  authCookieOptions,
  persistenceCookieOptions,
  remembersLogin,
} from "./auth-cookie";

export async function createSupabaseServerClient(options?: { remember?: boolean }) {
  const config = getSupabasePublicConfig();
  if (!config) return null;

  const cookieStore = await cookies();
  const remember = options?.remember
    ?? remembersLogin(cookieStore.get(AUTH_PERSISTENCE_COOKIE)?.value);

  if (options?.remember !== undefined) {
    cookieStore.set(
      AUTH_PERSISTENCE_COOKIE,
      options.remember ? "30d" : "session",
      persistenceCookieOptions(options.remember),
    );
  }

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, authCookieOptions(value, options, remember));
          });
        } catch {
          // Server Components cannot write cookies. The root proxy performs
          // refresh writes; Server Actions and Route Handlers can write here.
        }
      },
    },
  });
}
