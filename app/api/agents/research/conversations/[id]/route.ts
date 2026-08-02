import { requireResearchUser } from "@/lib/research-agent/auth";
import { RESEARCH_AGENT_ID } from "@/lib/research-agent/config";
import { apiError, apiJson, parseJsonBody } from "@/lib/research-agent/http";
import { validateConversationId, validateTitle } from "@/lib/research-agent/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireResearchUser();
  if (!auth.ok) return auth.response;
  const id = validateConversationId((await context.params).id);
  if (!id.ok) return apiError(400, "INVALID_REQUEST", id.error);
  const body = await parseJsonBody(request, 2_000);
  if (!body.ok) return body.response;
  const rawTitle = body.value && typeof body.value === "object" && "title" in body.value ? body.value.title : undefined;
  const title = validateTitle(rawTitle);
  if (!title.ok) return apiError(400, "INVALID_REQUEST", title.error);

  const { data, error } = await auth.supabase
    .from("ai_conversations")
    .update({ title: title.value, updated_at: new Date().toISOString() })
    .eq("id", id.value)
    .eq("user_id", auth.user.id)
    .eq("agent_id", RESEARCH_AGENT_ID)
    .is("archived_at", null)
    .select("id,title,agent_id,visibility,created_at,updated_at")
    .maybeSingle();

  if (error) return apiError(503, "DATABASE_ERROR", "Unable to rename this conversation.");
  if (!data) return apiError(404, "NOT_FOUND", "Conversation not found.");
  return apiJson({ conversation: { ...data, can_manage: true } });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireResearchUser();
  if (!auth.ok) return auth.response;
  const id = validateConversationId((await context.params).id);
  if (!id.ok) return apiError(400, "INVALID_REQUEST", id.error);

  const { data, error } = await auth.supabase
    .from("ai_conversations")
    .delete()
    .eq("id", id.value)
    .eq("user_id", auth.user.id)
    .eq("agent_id", RESEARCH_AGENT_ID)
    .select("id")
    .maybeSingle();

  if (error) return apiError(503, "DATABASE_ERROR", "Unable to delete this conversation.");
  if (!data) return apiError(404, "NOT_FOUND", "Conversation not found.");
  return apiJson({ deleted: true });
}
