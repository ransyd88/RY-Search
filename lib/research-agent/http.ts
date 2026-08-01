export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "CONFIGURATION_ERROR"
  | "DAILY_LIMIT"
  | "RATE_LIMIT"
  | "GENERATION_ACTIVE"
  | "UPSTREAM_ERROR"
  | "DATABASE_ERROR";

export function apiError(status: number, code: ApiErrorCode, message: string, headers?: HeadersInit) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

export function apiJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function parseJsonBody(request: Request, maxBytes = 25_000) {
  const declaredLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (declaredLength > maxBytes) return { ok: false as const, response: apiError(413, "INVALID_REQUEST", "Request body is too large.") };
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      return { ok: false as const, response: apiError(413, "INVALID_REQUEST", "Request body is too large.") };
    }
    return { ok: true as const, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false as const, response: apiError(400, "INVALID_REQUEST", "Request body must be valid JSON.") };
  }
}
