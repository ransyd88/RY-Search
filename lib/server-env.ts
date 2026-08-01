import { env } from "cloudflare:workers";

/**
 * Read a server-only environment value in both Node-based local tooling and
 * the Cloudflare Workers runtime.
 */
export function readServerEnv(name: string) {
  const nodeValue = process.env[name]?.trim();
  if (nodeValue) return nodeValue;

  const value = (env as unknown as Record<string, unknown>)[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
