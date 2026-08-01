import { requireResearchUser } from "@/lib/research-agent/auth";
import { RESEARCH_AGENT_ID } from "@/lib/research-agent/config";
import { apiError, apiJson, parseJsonBody } from "@/lib/research-agent/http";
import { validateTitle } from "@/lib/research-agent/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireResearchUser();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("ai_conversations")
    .select("id,title,agent_id,created_at,updated_at")
    .eq("user_id", auth.user.id)
    .eq("agent_id", RESEARCH_AGENT_ID)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  return error
    ? apiError(503, "DATABASE_ERROR", "Conversation history is temporarily unavailable.")
    : apiJson({ conversations: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireResearchUser();
  if (!auth.ok) return auth.response;

  let title = "New conversation";
  if ((request.headers.get("content-length") ?? "0") !== "0") {
    const body = await parseJsonBody(request, 2_000);
    if (!body.ok) return body.response;
    if (body.value && typeof body.value === "object" && "title" in body.value && body.value.title !== undefined) {
      const result = validateTitle(body.value.title);
      if (!result.ok) return apiError(400, "INVALID_REQUEST", result.error);
      title = result.value;
    }
  }

  const { data, error } = await auth.supabase
    .from("ai_conversations")
    .insert({ user_id: auth.user.id, agent_id: RESEARCH_AGENT_ID, title })
    .select("id,title,agent_id,created_at,updated_at")
    .single();

  return error || !data
    ? apiError(503, "DATABASE_ERROR", "Unable to create a conversation.")
    : apiJson({ conversation: data }, 201);
}
