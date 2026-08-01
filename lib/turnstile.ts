import { readServerEnv } from "@/lib/server-env";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileResult = {
  success?: boolean;
  hostname?: string;
  action?: string;
};

export async function verifyLoginTurnstile(token: string, remoteIp?: string) {
  if (!token || token.length > 2_048) return false;

  const secret = await readServerEnv("TURNSTILE_SECRET_KEY");
  const expectedHostname = await readServerEnv("TURNSTILE_EXPECTED_HOSTNAME");
  if (!secret) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
      idempotency_key: crypto.randomUUID(),
    });
    if (remoteIp) body.set("remoteip", remoteIp);

    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: controller.signal,
    });
    if (!response.ok) return false;

    const result = await response.json() as TurnstileResult;
    if (!result.success || result.action !== "login") return false;
    return !expectedHostname || result.hostname === expectedHostname;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
