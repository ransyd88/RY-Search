-- R&Y Research Agent: private conversations, messages and atomic usage limits.
-- Apply in Supabase SQL Editor or through the Supabase CLI.

create extension if not exists pgcrypto;

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id text not null default 'research' check (agent_id = 'research'),
  title text not null default 'New conversation' check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now(),
  input_tokens integer null check (input_tokens is null or input_tokens >= 0),
  output_tokens integer null check (output_tokens is null or output_tokens >= 0),
  model text null,
  status text not null default 'completed' check (status in ('completed', 'failed', 'aborted')),
  error_code text null
);

create table if not exists public.ai_daily_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  request_count integer not null default 0 check (request_count >= 0),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  estimated_cost_usd numeric null,
  minute_window_started_at timestamptz null,
  minute_request_count integer not null default 0 check (minute_request_count >= 0),
  active_generation_id uuid null,
  active_generation_started_at timestamptz null,
  updated_at timestamptz not null default now(),
  unique (user_id, usage_date)
);

create index if not exists ai_conversations_user_updated_idx
  on public.ai_conversations (user_id, updated_at desc);
create index if not exists ai_messages_conversation_created_idx
  on public.ai_messages (conversation_id, created_at, id);
create index if not exists ai_messages_user_created_idx
  on public.ai_messages (user_id, created_at);
create index if not exists ai_daily_usage_user_date_idx
  on public.ai_daily_usage (user_id, usage_date);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_daily_usage enable row level security;

drop policy if exists "Users select own AI conversations" on public.ai_conversations;
create policy "Users select own AI conversations" on public.ai_conversations
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own AI conversations" on public.ai_conversations;
create policy "Users insert own AI conversations" on public.ai_conversations
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own AI conversations" on public.ai_conversations;
create policy "Users update own AI conversations" on public.ai_conversations
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete own AI conversations" on public.ai_conversations;
create policy "Users delete own AI conversations" on public.ai_conversations
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users select own AI messages" on public.ai_messages;
create policy "Users select own AI messages" on public.ai_messages
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users read own AI usage" on public.ai_daily_usage;
create policy "Users read own AI usage" on public.ai_daily_usage
  for select to authenticated using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.ai_daily_usage from authenticated, anon;
revoke all on public.ai_conversations, public.ai_messages, public.ai_daily_usage from anon;
grant select, insert, update, delete on public.ai_conversations to authenticated;
grant select on public.ai_messages to authenticated;
grant select on public.ai_daily_usage to authenticated;
grant select, insert, update, delete on public.ai_conversations, public.ai_messages, public.ai_daily_usage to service_role;

create or replace function public.consume_ai_usage(p_user_id uuid, p_daily_limit integer, p_minute_limit integer, p_generation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := p_user_id;
  v_now timestamptz := now();
  v_usage public.ai_daily_usage;
begin
  if v_user_id is null then raise exception 'invalid_user_id' using errcode = '22023'; end if;
  if p_daily_limit < 1 or p_minute_limit < 1 then raise exception 'invalid_limit' using errcode = '22023'; end if;
  if p_generation_id is null then raise exception 'invalid_generation_id' using errcode = '22023'; end if;

  insert into public.ai_daily_usage (user_id, usage_date, minute_window_started_at)
  values (v_user_id, (v_now at time zone 'Australia/Sydney')::date, v_now)
  on conflict (user_id, usage_date) do nothing;

  select * into v_usage from public.ai_daily_usage
  where user_id = v_user_id and usage_date = (v_now at time zone 'Australia/Sydney')::date
  for update;

  if v_usage.active_generation_id is not null
    and v_usage.active_generation_started_at > v_now - interval '6 minutes' then
    return jsonb_build_object('allowed', false, 'reason', 'active', 'used', v_usage.request_count);
  end if;

  if v_usage.request_count >= p_daily_limit then
    return jsonb_build_object('allowed', false, 'reason', 'daily', 'used', v_usage.request_count);
  end if;

  if v_usage.minute_window_started_at is null or v_usage.minute_window_started_at <= v_now - interval '1 minute' then
    v_usage.minute_window_started_at := v_now;
    v_usage.minute_request_count := 0;
  end if;

  if v_usage.minute_request_count >= p_minute_limit then
    return jsonb_build_object('allowed', false, 'reason', 'minute', 'used', v_usage.request_count);
  end if;

  update public.ai_daily_usage set
    request_count = request_count + 1,
    minute_window_started_at = v_usage.minute_window_started_at,
    minute_request_count = v_usage.minute_request_count + 1,
    active_generation_id = p_generation_id,
    active_generation_started_at = v_now,
    updated_at = v_now
  where id = v_usage.id
  returning * into v_usage;

  return jsonb_build_object('allowed', true, 'reason', null, 'used', v_usage.request_count);
end;
$$;

create or replace function public.release_ai_generation(p_user_id uuid, p_generation_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_daily_usage
  set active_generation_id = null, active_generation_started_at = null, updated_at = now()
  where user_id = p_user_id and active_generation_id = p_generation_id;
$$;

create or replace function public.record_ai_token_usage(p_user_id uuid, p_input_tokens integer, p_output_tokens integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then raise exception 'invalid_user_id' using errcode = '22023'; end if;
  update public.ai_daily_usage set
    input_tokens = input_tokens + greatest(coalesce(p_input_tokens, 0), 0),
    output_tokens = output_tokens + greatest(coalesce(p_output_tokens, 0), 0),
    updated_at = now()
  where user_id = p_user_id
    and usage_date = (now() at time zone 'Australia/Sydney')::date;
end;
$$;

revoke all on function public.consume_ai_usage(uuid, integer, integer, uuid) from public, anon, authenticated;
revoke all on function public.release_ai_generation(uuid, uuid) from public, anon, authenticated;
revoke all on function public.record_ai_token_usage(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_usage(uuid, integer, integer, uuid) to service_role;
grant execute on function public.release_ai_generation(uuid, uuid) to service_role;
grant execute on function public.record_ai_token_usage(uuid, integer, integer) to service_role;
