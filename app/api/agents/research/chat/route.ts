import OpenAI from "openai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireResearchUser } from "@/lib/research-agent/auth";
import {
  getOpenAIConfig,
  getResearchAgentLimits,
  RESEARCH_AGENT_ID,
  RESEARCH_AGENT_INSTRUCTIONS,
} from "@/lib/research-agent/config";
import { apiError, parseJsonBody } from "@/lib/research-agent/http";
import { beginGeneration, endGeneration } from "@/lib/research-agent/rate-limit";
import { encodeSse } from "@/lib/research-agent/sse";
import {
  titleFromMessage,
  validateAgentId,
  validateConversationId,
  validateMessage,
} from "@/lib/research-agent/validation";

export const dynamic = "force-dynamic";

type StoredMessage = { role: "user" | "assistant"; content: string };
type UsageResult = { allowed?: boolean; reason?: "daily" | "minute" | "active" | null; used?: number };

export async function POST(request: Request) {
  const auth = await requireResearchUser();
  if (!auth.ok) return auth.response;

  const limits = getResearchAgentLimits();
  const body = await parseJsonBody(request, limits.maxMessageLength + 2_000);
  if (!body.ok) return body.response;
  if (!body.value || typeof body.value !== "object") {
    return apiError(400, "INVALID_REQUEST", "Invalid request.");
  }

  const payload = body.value as Record<string, unknown>;
  const agent = validateAgentId(payload.agentId);
  const conversationId = validateConversationId(payload.conversationId);
  const message = validateMessage(payload.message, limits.maxMessageLength);
  if (!agent.ok) return apiError(400, "INVALID_REQUEST", agent.error);
  if (!conversationId.ok) return apiError(400, "INVALID_REQUEST", conversationId.error);
  if (!message.ok) return apiError(400, "INVALID_REQUEST", message.error);

  const { data: conversation, error: conversationError } = await auth.supabase
    .from("ai_conversations")
    .select("id,title")
    .eq("id", conversationId.value)
    .eq("user_id", auth.user.id)
    .eq("agent_id", RESEARCH_AGENT_ID)
    .is("archived_at", null)
    .maybeSingle();
  if (conversationError) return apiError(503, "DATABASE_ERROR", "Unable to verify this conversation.");
  if (!conversation) return apiError(404, "NOT_FOUND", "Conversation not found.");

  const openAIConfig = getOpenAIConfig();
  const adminSupabase = createSupabaseAdminClient();
  if (!openAIConfig || !adminSupabase) {
    return apiError(503, "CONFIGURATION_ERROR", "The Research Agent is not configured yet. Contact an administrator.");
  }

  if (!beginGeneration(auth.user.id)) {
    return apiError(429, "GENERATION_ACTIVE", "Another response is already being generated. Please wait or stop it first.", {
      "Retry-After": "3",
    });
  }

  const generationId = crypto.randomUUID();
  const { data: usageData, error: usageError } = await adminSupabase.rpc("consume_ai_usage", {
    p_user_id: auth.user.id,
    p_daily_limit: limits.dailyMessageLimit,
    p_minute_limit: limits.perMinuteLimit,
    p_generation_id: generationId,
  });
  const usage = (usageData ?? {}) as UsageResult;
  if (usageError) {
    endGeneration(auth.user.id);
    return apiError(503, "DATABASE_ERROR", "Usage controls are temporarily unavailable.");
  }
  if (!usage.allowed) {
    endGeneration(auth.user.id);
    const daily = usage.reason === "daily";
    const active = usage.reason === "active";
    return apiError(429, daily ? "DAILY_LIMIT" : active ? "GENERATION_ACTIVE" : "RATE_LIMIT", daily
      ? "You have reached today's Research Agent message limit."
      : active
        ? "Another response is already being generated. Please wait or stop it first."
        : "Too many requests were sent in a short period. Please wait a minute and try again.", {
      "Retry-After": daily ? "3600" : active ? "3" : "60",
    });
  }

  const { data: userMessage, error: insertError } = await adminSupabase
    .from("ai_messages")
    .insert({
      conversation_id: conversationId.value,
      user_id: auth.user.id,
      role: "user",
      content: message.value,
      status: "completed",
    })
    .select("id,created_at")
    .single();
  if (insertError || !userMessage) {
    await adminSupabase.rpc("release_ai_generation", { p_user_id: auth.user.id, p_generation_id: generationId });
    endGeneration(auth.user.id);
    return apiError(503, "DATABASE_ERROR", "Unable to save your message.");
  }

  let generatedTitle: string | undefined;
  if (conversation.title === "New conversation") {
    generatedTitle = titleFromMessage(message.value);
    await auth.supabase
      .from("ai_conversations")
      .update({ title: generatedTitle, updated_at: new Date().toISOString() })
      .eq("id", conversationId.value)
      .eq("user_id", auth.user.id);
  }

  const { data: recentRows, error: historyError } = await auth.supabase
    .from("ai_messages")
    .select("role,content")
    .eq("conversation_id", conversationId.value)
    .eq("user_id", auth.user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(limits.contextMessageLimit);
  if (historyError) {
    await adminSupabase.rpc("release_ai_generation", { p_user_id: auth.user.id, p_generation_id: generationId });
    endGeneration(auth.user.id);
    return apiError(503, "DATABASE_ERROR", "Unable to prepare conversation context.");
  }

  const input = ((recentRows ?? []) as StoredMessage[]).reverse().map((item) => ({
    role: item.role,
    content: item.content,
  }));
  const openai = new OpenAI({ apiKey: openAIConfig.apiKey });
  const encoder = new TextEncoder();
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort("timeout"), limits.upstreamTimeoutMs);
  const signal = AbortSignal.any([request.signal, timeoutController.signal]);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = "";
      let completed = false;
      try {
        controller.enqueue(encoder.encode(encodeSse({
          type: "ready",
          userMessageId: userMessage.id,
          ...(generatedTitle ? { title: generatedTitle } : {}),
          usage: { used: usage.used ?? 0, limit: limits.dailyMessageLimit },
        })));

        const responseStream = await openai.responses.create({
          model: openAIConfig.model,
          instructions: RESEARCH_AGENT_INSTRUCTIONS,
          input,
          max_output_tokens: limits.maxOutputTokens,
          store: false,
          stream: true,
        }, { signal });

        for await (const event of responseStream) {
          if (signal.aborted) throw new DOMException("Aborted", "AbortError");
          if (event.type === "response.output_text.delta") {
            assistantText += event.delta;
            controller.enqueue(encoder.encode(encodeSse({ type: "delta", delta: event.delta })));
          } else if (event.type === "response.completed") {
            const cleanText = assistantText.trim();
            if (!cleanText) throw new Error("empty_response");
            const usageInfo = event.response.usage;
            const { data: assistantMessage, error: assistantError } = await adminSupabase
              .from("ai_messages")
              .insert({
                conversation_id: conversationId.value,
                user_id: auth.user.id,
                role: "assistant",
                content: cleanText,
                input_tokens: usageInfo?.input_tokens ?? null,
                output_tokens: usageInfo?.output_tokens ?? null,
                model: openAIConfig.model,
                status: "completed",
              })
              .select("id,created_at")
              .single();
            if (assistantError || !assistantMessage) throw new Error("assistant_save_failed");
            await Promise.all([
              auth.supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() })
                .eq("id", conversationId.value).eq("user_id", auth.user.id),
              adminSupabase.rpc("record_ai_token_usage", {
                p_user_id: auth.user.id,
                p_input_tokens: usageInfo?.input_tokens ?? 0,
                p_output_tokens: usageInfo?.output_tokens ?? 0,
              }),
            ]);
            completed = true;
            controller.enqueue(encoder.encode(encodeSse({
              type: "complete",
              assistantMessageId: assistantMessage.id,
              createdAt: assistantMessage.created_at,
            })));
          } else if (event.type === "response.failed" || event.type === "error") {
            throw new Error("upstream_failed");
          }
        }

        if (!completed) throw new Error("incomplete_stream");
      } catch (error) {
        const aborted = signal.aborted || (error instanceof DOMException && error.name === "AbortError");
        if (!completed) {
          await adminSupabase.from("ai_messages").insert({
            conversation_id: conversationId.value,
            user_id: auth.user.id,
            role: "assistant",
            content: "",
            model: openAIConfig.model,
            status: aborted ? "aborted" : "failed",
            error_code: aborted ? "generation_aborted" : "upstream_error",
          });
        }
        if (!request.signal.aborted) {
          controller.enqueue(encoder.encode(encodeSse(aborted
            ? { type: "aborted" }
            : { type: "error", code: "UPSTREAM_ERROR", message: "The response could not be completed. Your message was saved; please retry when ready." })));
        }
      } finally {
        clearTimeout(timeout);
        await adminSupabase.rpc("release_ai_generation", { p_user_id: auth.user.id, p_generation_id: generationId });
        endGeneration(auth.user.id);
        try { controller.close(); } catch { /* The browser may already have disconnected. */ }
      }
    },
    cancel() {
      timeoutController.abort("client_disconnected");
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-store",
      "Content-Type": "text/event-stream; charset=utf-8",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
