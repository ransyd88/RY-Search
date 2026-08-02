import { requireResearchUser } from "@/lib/research-agent/auth";
import { RESEARCH_AGENT_ID } from "@/lib/research-agent/config";
import { apiError, apiJson } from "@/lib/research-agent/http";
import { validateConversationId } from "@/lib/research-agent/validation";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireResearchUser();
  if (!auth.ok) return auth.response;
  const id = validateConversationId((await params).id);
  if (!id.ok) return apiError(400, "INVALID_REQUEST", id.error);

  const { data: conversation, error: conversationError } = await auth.supabase
    .from("ai_conversations")
    .select("id,title,visibility,user_id")
    .eq("id", id.value)
    .eq("agent_id", RESEARCH_AGENT_ID)
    .is("archived_at", null)
    .maybeSingle();

  if (conversationError) return apiError(503, "DATABASE_ERROR", "Unable to load this conversation.");
  if (!conversation || (conversation.visibility === "private" && conversation.user_id !== auth.user.id)) {
    return apiError(404, "NOT_FOUND", "Conversation not found.");
  }

  const { data: messages, error } = await auth.supabase
    .from("ai_messages")
    .select("id,conversation_id,user_id,role,content,created_at,status,error_code")
    .eq("conversation_id", id.value)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  return error
    ? apiError(503, "DATABASE_ERROR", "Messages are temporarily unavailable.")
    : apiJson({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        visibility: conversation.visibility,
        can_manage: conversation.user_id === auth.user.id,
      },
      messages: (messages ?? []).map(({ user_id, ...message }) => ({
        ...message,
        is_mine: user_id === auth.user.id,
      })),
    });
}
