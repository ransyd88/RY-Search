-- R&Y Research Agent shared workspace with opt-in private conversations.
-- Safe to run once after 20260801000000_research_agent.sql.

alter table public.ai_conversations
  add column if not exists visibility text not null default 'shared';

alter table public.ai_conversations
  drop constraint if exists ai_conversations_visibility_check;
alter table public.ai_conversations
  add constraint ai_conversations_visibility_check
  check (visibility in ('shared', 'private'));

create index if not exists ai_conversations_visibility_updated_idx
  on public.ai_conversations (visibility, updated_at desc)
  where archived_at is null;

drop policy if exists "Users select own AI conversations" on public.ai_conversations;
drop policy if exists "Workspace members select visible AI conversations" on public.ai_conversations;
create policy "Workspace members select visible AI conversations" on public.ai_conversations
  for select to authenticated
  using (visibility = 'shared' or (select auth.uid()) = user_id);

drop policy if exists "Users select own AI messages" on public.ai_messages;
drop policy if exists "Workspace members select visible AI messages" on public.ai_messages;
create policy "Workspace members select visible AI messages" on public.ai_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.ai_conversations conversation
      where conversation.id = ai_messages.conversation_id
        and conversation.archived_at is null
        and (conversation.visibility = 'shared' or conversation.user_id = (select auth.uid()))
    )
  );

-- Creation and management remain owner-only. Shared visibility grants read/chat
-- participation through authenticated server routes, never rename/delete rights.
drop policy if exists "Users insert own AI conversations" on public.ai_conversations;
create policy "Users insert own AI conversations" on public.ai_conversations
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own AI conversations" on public.ai_conversations;
create policy "Users update own AI conversations" on public.ai_conversations
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own AI conversations" on public.ai_conversations;
create policy "Users delete own AI conversations" on public.ai_conversations
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.ai_conversations, public.ai_messages from anon;
grant select, insert, update, delete on public.ai_conversations to authenticated;
grant select on public.ai_messages to authenticated;

