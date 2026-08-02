import { requireResearchUser } from "@/lib/research-agent/auth";
import { RESEARCH_AGENT_ID } from "@/lib/research-agent/config";
import { apiError, apiJson, parseJsonBody } from "@/lib/research-agent/http";
import { validateConversationVisibility, validateTitle } from "@/lib/research-agent/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireResearchUser();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("ai_conversations")
    .select("id,title,agent_id,visibility,user_id,created_at,updated_at")
    .eq("agent_id", RESEARCH_AGENT_ID)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  return error
    ? apiError(503, "DATABASE_ERROR", "Conversation history is temporarily unavailable.")
    : apiJson({ conversations: (data ?? []).map(({ user_id, ...conversation }) => ({
      ...conversation,
      can_manage: user_id === auth.user.id,
    })) });
}

export async function POST(request: Request) {
  const auth = await requireResearchUser();
  if (!auth.ok) return auth.response;

  let title = "New conversation";
  let visibility: "shared" | "private" = "shared";
  if ((request.headers.get("content-length") ?? "0") !== "0") {
    const body = await parseJsonBody(request, 2_000);
    if (!body.ok) return body.response;
    if (body.value && typeof body.value === "object" && "title" in body.value && body.value.title !== undefined) {
      const result = validateTitle(body.value.title);
      if (!result.ok) return apiError(400, "INVALID_REQUEST", result.error);
      title = result.value;
    }
    if (body.value && typeof body.value === "object" && "visibility" in body.value) {
      const result = validateConversationVisibility(body.value.visibility);
      if (!result.ok) return apiError(400, "INVALID_REQUEST", result.error);
      visibility = result.value;
    }
  }

  const { data, error } = await auth.supabase
    .from("ai_conversations")
    .insert({ user_id: auth.user.id, agent_id: RESEARCH_AGENT_ID, title, visibility })
    .select("id,title,agent_id,visibility,created_at,updated_at")
    .single();

  return error || !data
    ? apiError(503, "DATABASE_ERROR", "Unable to create a conversation.")
    : apiJson({ conversation: { ...data, can_manage: true } }, 201);
}
