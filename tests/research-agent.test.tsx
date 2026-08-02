import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getOpenAIConfig, getResearchMode } from "../lib/research-agent/config";
import { beginGeneration, endGeneration } from "../lib/research-agent/rate-limit";
import { encodeSse, parseSseBuffer } from "../lib/research-agent/sse";
import {
  titleFromMessage,
  validateConversationId,
  validateConversationVisibility,
  validateMessage,
  validateTitle,
} from "../lib/research-agent/validation";
import {
  AUTH_PERSISTENCE_SECONDS,
  authCookieOptions,
  persistenceCookieOptions,
  remembersLogin,
} from "../lib/supabase/auth-cookie";

const root = process.cwd();

test("brand and photography assets referenced by the interface exist", async () => {
  const assets = [
    "public/brand/wordmark-slate.png",
    "public/brand/wordmark-white.png",
    "public/brand/wordmark-gold.png",
    "public/brand/monogram-slate.png",
    "public/brand/monogram-white.png",
    "public/brand/monogram-gold.png",
    "public/brand/cursor-arrow-right-glow-small-v4.png",
    "public/brand/og-social.jpg",
    "public/images/hero-architecture.jpg",
    "public/images/concrete-facade.jpg",
    "public/images/blue-facade.jpg",
  ];

  await Promise.all(assets.map((asset) => readFile(path.join(root, asset))));
});

test("remember-me creates a 30-day cookie while the default remains session-only", () => {
  assert.equal(remembersLogin("30d"), true);
  assert.equal(remembersLogin("session"), false);

  const persistent = authCookieOptions("token", { path: "/" }, true);
  assert.equal(persistent.maxAge, AUTH_PERSISTENCE_SECONDS);
  assert.ok(persistent.expires instanceof Date);

  const session = authCookieOptions(
    "token",
    { expires: new Date(), maxAge: 999, path: "/" },
    false,
  );
  assert.equal(session.maxAge, undefined);
  assert.equal(session.expires, undefined);
  assert.equal(persistenceCookieOptions(false).httpOnly, true);
});

test("request validation rejects missing, oversized and invalid input", () => {
  assert.equal(validateMessage("   ", 100).ok, false);
  assert.equal(validateMessage("x".repeat(101), 100).ok, false);
  assert.equal(validateMessage(" valid ", 100).ok, true);
  assert.equal(validateConversationId("not-a-uuid").ok, false);
  assert.equal(validateConversationId("037b3a90-e411-4b67-9c92-b2d958f58121").ok, true);
  assert.equal(validateConversationVisibility(undefined).ok, true);
  assert.equal(validateConversationVisibility("shared").ok, true);
  assert.equal(validateConversationVisibility("private").ok, true);
  assert.equal(validateConversationVisibility("public").ok, false);
  assert.equal(validateTitle("").ok, false);
  assert.equal(validateTitle("x".repeat(121)).ok, false);
});

test("first-message titles are local, concise and single-line", () => {
  const title = titleFromMessage("  Review\n\nthis investment opportunity with several important assumptions that need testing  ");
  assert.doesNotMatch(title, /\n/);
  assert.ok(title.length <= 56);
  assert.match(title, /…$/);
});

test("stream parser handles progressive normal completion", () => {
  const source = encodeSse({ type: "delta", delta: "Hello " })
    + encodeSse({ type: "delta", delta: "Sydney" })
    + encodeSse({ type: "complete", assistantMessageId: "message-id", createdAt: "2026-08-01T00:00:00Z" });
  const split = Math.floor(source.length / 2);
  const first = parseSseBuffer(source.slice(0, split));
  const second = parseSseBuffer(first.remainder + source.slice(split));
  assert.equal([...first.events, ...second.events].filter((event) => event.type === "delta").length, 2);
  assert.equal(second.events.at(-1)?.type, "complete");
});

test("one active generation per user prevents duplicate assistant attempts", () => {
  const userId = "test-user";
  assert.equal(beginGeneration(userId), true);
  assert.equal(beginGeneration(userId), false);
  endGeneration(userId);
  assert.equal(beginGeneration(userId), true);
  endGeneration(userId);
});

test("Markdown rendering escapes raw script HTML", () => {
  const html = renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{"# Research\n\n<script>alert('x')</script>\n\n**safe**"}</ReactMarkdown>,
  );
  assert.doesNotMatch(html, /<script[\s>]/i);
  assert.match(html, /&lt;script&gt;/i);
  assert.match(html, /<strong>safe<\/strong>/i);
});

test("OpenAI configuration requires a server-side API key", () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  assert.equal(getOpenAIConfig(), null);
  if (previousKey) process.env.OPENAI_API_KEY = previousKey;
});

test("research modes map only to fixed server-side models", () => {
  assert.equal(getResearchMode("luna")?.model, "gpt-5.6-luna");
  assert.equal(getResearchMode("terra")?.model, "gpt-5.6-terra");
  assert.equal(getResearchMode("gpt-5.6-sol"), null);
  assert.equal(getResearchMode({ model: "gpt-5.6-sol" }), null);
});

test("login requires server-side Turnstile verification before authentication", async () => {
  const action = await readFile(path.join(root, "app/login/actions.ts"), "utf8");
  const validator = await readFile(path.join(root, "lib/turnstile.ts"), "utf8");
  assert.match(action, /verifyLoginTurnstile\(turnstileToken, remoteIp\)/);
  assert.ok(action.indexOf("verifyLoginTurnstile") < action.indexOf("signInWithPassword"));
  assert.match(validator, /challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
  assert.match(validator, /result\.action !== "login"/);
  assert.match(validator, /result\.hostname === expectedHostname/);
  assert.match(validator, /TURNSTILE_SECRET_KEY/);
});

test("migration enforces ownership, RLS, chronological storage and atomic limits", async () => {
  const sql = await readFile(path.join(root, "supabase/migrations/20260801000000_research_agent.sql"), "utf8");
  const visibilitySql = await readFile(path.join(root, "supabase/migrations/20260802000000_shared_conversation_visibility.sql"), "utf8");
  for (const table of ["ai_conversations", "ai_messages", "ai_daily_usage"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.doesNotMatch(sql, /using\s*\(\s*true\s*\)/i);
  assert.match(sql, /auth\.uid\(\)\) = user_id/i);
  assert.match(sql, /unique\s*\(user_id, usage_date\)/i);
  assert.match(sql, /consume_ai_usage/i);
  assert.match(sql, /reason', 'daily'/i);
  assert.match(sql, /reason', 'minute'/i);
  assert.match(sql, /reason', 'active'/i);
  assert.match(sql, /release_ai_generation/i);
  assert.match(sql, /revoke all on function public\.consume_ai_usage[\s\S]*authenticated/i);
  assert.match(sql, /grant execute on function public\.consume_ai_usage[\s\S]*service_role/i);
  assert.doesNotMatch(sql, /grant execute on function public\.consume_ai_usage[\s\S]*to authenticated/i);
  assert.match(sql, /grant select on public\.ai_messages to authenticated/i);
  assert.doesNotMatch(sql, /grant select, insert on public\.ai_messages to authenticated/i);
  assert.match(sql, /ai_messages_conversation_created_idx/i);
  assert.match(visibilitySql, /visibility in \('shared', 'private'\)/i);
  assert.match(visibilitySql, /visibility = 'shared' or \(select auth\.uid\(\)\) = user_id/i);
  assert.match(visibilitySql, /exists\s*\([\s\S]*ai_conversations[\s\S]*conversation\.user_id = \(select auth\.uid\(\)\)/i);
  assert.doesNotMatch(visibilitySql, /using\s*\(\s*true\s*\)/i);
  assert.match(visibilitySql, /revoke all on public\.ai_conversations, public\.ai_messages from anon/i);
});

test("conversation endpoints enforce shared reads, shared deletion and owner-only private management", async () => {
  const collection = await readFile(path.join(root, "app/api/agents/research/conversations/route.ts"), "utf8");
  const item = await readFile(path.join(root, "app/api/agents/research/conversations/[id]/route.ts"), "utf8");
  const messages = await readFile(path.join(root, "app/api/agents/research/conversations/[id]/messages/route.ts"), "utf8");
  const chat = await readFile(path.join(root, "app/api/agents/research/chat/route.ts"), "utf8");
  assert.match(collection, /export async function POST/);
  assert.match(item, /export async function PATCH/);
  assert.match(item, /export async function DELETE/);
  assert.doesNotMatch(collection, /\.eq\("user_id", auth\.user\.id\)/);
  assert.match(collection, /can_manage: user_id === auth\.user\.id/);
  assert.match(collection, /can_delete: conversation\.visibility === "shared" \|\| user_id === auth\.user\.id/);
  assert.match(collection, /validateConversationVisibility/);
  assert.match(item, /conversation\.visibility === "private" && conversation\.user_id !== auth\.user\.id/);
  assert.match(item, /createSupabaseAdminClient/);
  assert.match(item, /adminSupabase[\s\S]*\.from\("ai_conversations"\)[\s\S]*\.delete\(\)/);
  assert.match(messages, /conversation\.visibility === "private" && conversation\.user_id !== auth\.user\.id/);
  assert.match(chat, /conversation\.visibility === "private" && conversation\.user_id !== auth\.user\.id/);
  assert.doesNotMatch(messages, /\.eq\("conversation_id", id\.value\)[\s\S]{0,100}\.eq\("user_id", auth\.user\.id\)/);
  assert.doesNotMatch(chat, /\.eq\("conversation_id", conversationId\.value\)[\s\S]{0,100}\.eq\("user_id", auth\.user\.id\)/);
  assert.match(messages, /order\("created_at", \{ ascending: true \}\)/);
  assert.match(chat, /apiError\(503, "CONFIGURATION_ERROR"/);
  assert.match(chat, /daily \? "DAILY_LIMIT" : active \? "GENERATION_ACTIVE" : "RATE_LIMIT"/);
  assert.match(chat, /status: "completed"/);
  assert.match(chat, /status: aborted \? "aborted" : "failed"/);
  assert.match(chat, /adminSupabase[\s\S]*\.from\("ai_messages"\)[\s\S]*\.insert/);
  assert.doesNotMatch(chat, /payload\.(model|systemPrompt|instructions)/);
  assert.match(chat, /getResearchMode\(payload\.mode\)/);
});
