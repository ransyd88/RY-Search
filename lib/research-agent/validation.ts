import { RESEARCH_AGENT_ID } from "./config";

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function validateMessage(value: unknown, maximumLength: number): ValidationResult<string> {
  if (typeof value !== "string") return { ok: false, error: "A message is required." };
  const message = value.trim();
  if (!message) return { ok: false, error: "A message is required." };
  if (message.length > maximumLength) {
    return { ok: false, error: `Message exceeds the ${maximumLength.toLocaleString("en-AU")} character limit.` };
  }
  return { ok: true, value: message };
}

export function validateConversationId(value: unknown): ValidationResult<string> {
  return isUuid(value)
    ? { ok: true, value }
    : { ok: false, error: "Invalid conversation identifier." };
}

export function validateAgentId(value: unknown): ValidationResult<typeof RESEARCH_AGENT_ID> {
  return value === undefined || value === RESEARCH_AGENT_ID
    ? { ok: true, value: RESEARCH_AGENT_ID }
    : { ok: false, error: "Unsupported agent." };
}

export function validateTitle(value: unknown): ValidationResult<string> {
  if (typeof value !== "string") return { ok: false, error: "A title is required." };
  const title = value.replace(/\s+/g, " ").trim();
  if (!title) return { ok: false, error: "A title is required." };
  if (title.length > 120) return { ok: false, error: "Title exceeds 120 characters." };
  return { ok: true, value: title };
}

export function titleFromMessage(message: string) {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > 56 ? `${clean.slice(0, 55).trimEnd()}…` : clean;
}
