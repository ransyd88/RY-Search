/**
 * Read a server-only environment value in both Node-based local tooling and
 * the Cloudflare Workers runtime. Cloudflare runtime bindings are accessed
 * lazily so this module remains safe to import during local tests and builds.
 */
export async function readServerEnv(name: string) {
  const nodeValue = process.env[name]?.trim();
  if (nodeValue) return nodeValue;

  try {
    const { env } = await import("cloudflare:workers");
    const value = (env as unknown as Record<string, unknown>)[name];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}
