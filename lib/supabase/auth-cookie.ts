import type { CookieOptions } from "@supabase/ssr";

export const AUTH_PERSISTENCE_COOKIE = "ry-auth-persistence";
export const AUTH_PERSISTENCE_DAYS = 30;
export const AUTH_PERSISTENCE_SECONDS = 60 * 60 * 24 * AUTH_PERSISTENCE_DAYS;

export function remembersLogin(value: string | undefined) {
  return value === "30d";
}

export function authCookieOptions(
  value: string,
  options: CookieOptions,
  remember: boolean,
): CookieOptions {
  if (!value || options.maxAge === 0) return options;

  if (!remember) {
    const sessionOptions = { ...options };
    delete sessionOptions.expires;
    delete sessionOptions.maxAge;
    return sessionOptions;
  }

  return {
    ...options,
    expires: new Date(Date.now() + AUTH_PERSISTENCE_SECONDS * 1000),
    maxAge: AUTH_PERSISTENCE_SECONDS,
  };
}

export function persistenceCookieOptions(remember: boolean): CookieOptions {
  const base: CookieOptions = {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };

  if (!remember) return base;

  return {
    ...base,
    expires: new Date(Date.now() + AUTH_PERSISTENCE_SECONDS * 1000),
    maxAge: AUTH_PERSISTENCE_SECONDS,
  };
}
