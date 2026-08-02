import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabasePublicConfig } from "./lib/supabase/config";
import {
  AUTH_PERSISTENCE_COOKIE,
  authCookieOptions,
  remembersLogin,
} from "./lib/supabase/auth-cookie";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const config = getSupabasePublicConfig();

  response.headers.set("Cache-Control", "private, no-store");

  if (!config) return response;
  const remember = remembersLogin(request.cookies.get(AUTH_PERSISTENCE_COOKIE)?.value);

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, authCookieOptions(value, options, remember));
        });

        Object.entries(cacheHeaders).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  // This validates the token and refreshes expired sessions before protected
  // Server Components run. Never replace this with getSession().
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/login", "/portal/:path*"],
};
