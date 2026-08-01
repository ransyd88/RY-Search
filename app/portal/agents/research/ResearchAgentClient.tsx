"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LanguageSwitch, type SiteLanguage } from "@/components/LanguageSwitch";
import { parseSseBuffer } from "@/lib/research-agent/sse";
import { logout } from "@/app/portal/actions";

type Conversation = {
  id: string;
  title: string;
  agent_id: string;
  created_at: string;
  updated_at: string;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  status: "completed" | "failed" | "aborted" | "streaming";
  error_code?: string | null;
};

type ApiFailure = { error?: { code?: string; message?: string } };

const content = {
  en: {
    back: "Private Portal",
    newConversation: "New conversation",
    history: "Conversation history",
    emptyHistory: "No conversations yet",
    title: "R&Y Research Agent",
    subtitle: "Research support across markets, companies and investment themes.",
    placeholder: "Ask a research question…",
    send: "Send",
    stop: "Stop",
    notice: "AI-generated content may be incomplete or inaccurate. Verify important information independently.",
    ready: "Private · No live web or document access",
    copy: "Copy",
    copied: "Copied",
    rename: "Rename",
    remove: "Delete",
    menu: "Open conversations",
    close: "Close conversations",
    luna: "LUNA",
    lunaDescription: "Standard research",
    terra: "TERRA",
    terraDescription: "Deep analysis",
  },
  zh: {
    back: "私人门户",
    newConversation: "新建对话",
    history: "对话记录",
    emptyHistory: "暂无对话",
    title: "R&Y 研究智能体",
    subtitle: "协助研究市场、公司与投资主题。",
    placeholder: "输入研究问题…",
    send: "发送",
    stop: "停止",
    notice: "AI 生成内容可能不完整或不准确，请独立核实重要信息。",
    ready: "私人使用 · 暂无实时网络或文件访问",
    copy: "复制",
    copied: "已复制",
    rename: "重命名",
    remove: "删除",
    menu: "打开对话记录",
    close: "关闭对话记录",
    luna: "LUNA",
    lunaDescription: "标准研究",
    terra: "TERRA",
    terraDescription: "深度分析",
  },
} as const;

function safeHref(href?: string) {
  if (!href) return undefined;
  return /^(https?:|mailto:)/i.test(href) ? href : undefined;
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json().catch(() => ({})) as T & ApiFailure;
  if (!response.ok) throw new Error(payload.error?.message ?? "The request could not be completed.");
  return payload;
}

export function ResearchAgentClient({ email, language }: { email: string; language: SiteLanguage }) {
  const t = content[language];
  const zh = language === "zh";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [mode, setMode] = useState<"luna" | "terra">("luna");
  const abortRef = useRef<AbortController | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const followStreamRef = useRef(true);

  const loadMessages = useCallback(async (conversationId: string) => {
    setError(null);
    const result = await jsonRequest<{ messages: ChatMessage[] }>(`/api/agents/research/conversations/${conversationId}/messages`);
    setMessages(result.messages);
    setActiveId(conversationId);
    setDrawerOpen(false);
    followStreamRef.current = true;
  }, []);

  useEffect(() => {
    let current = true;
    jsonRequest<{ conversations: Conversation[] }>("/api/agents/research/conversations")
      .then(async (result) => {
        if (!current) return;
        setConversations(result.conversations);
        if (result.conversations[0]) await loadMessages(result.conversations[0].id);
      })
      .catch((reason: Error) => current && setError(reason.message))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [loadMessages]);

  useEffect(() => {
    if (!followStreamRef.current || !chatRef.current) return;
    chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: generating ? "auto" : "smooth" });
  }, [messages, generating]);

  async function createConversation() {
    const result = await jsonRequest<{ conversation: Conversation }>("/api/agents/research/conversations", {
      method: "POST",
      body: JSON.stringify({}),
    });
    setConversations((items) => [result.conversation, ...items]);
    setMessages([]);
    setActiveId(result.conversation.id);
    setDrawerOpen(false);
    return result.conversation.id;
  }

  async function renameConversation(conversation: Conversation) {
    const nextTitle = window.prompt(zh ? "输入新的对话名称" : "Enter a new conversation name", conversation.title);
    if (!nextTitle || nextTitle.trim() === conversation.title) return;
    try {
      const result = await jsonRequest<{ conversation: Conversation }>(`/api/agents/research/conversations/${conversation.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: nextTitle }),
      });
      setConversations((items) => items.map((item) => item.id === conversation.id ? result.conversation : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to rename the conversation.");
    }
  }

  async function deleteConversation(conversation: Conversation) {
    if (!window.confirm(zh ? `删除“${conversation.title}”？` : `Delete “${conversation.title}”?`)) return;
    try {
      await jsonRequest(`/api/agents/research/conversations/${conversation.id}`, { method: "DELETE" });
      const remaining = conversations.filter((item) => item.id !== conversation.id);
      setConversations(remaining);
      if (activeId === conversation.id) {
        setActiveId(null);
        setMessages([]);
        if (remaining[0]) await loadMessages(remaining[0].id);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete the conversation.");
    }
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || generating) return;
    setError(null);

    let conversationId = activeId;
    try {
      if (!conversationId) conversationId = await createConversation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create a conversation.");
      return;
    }

    const optimisticUserId = `local-user-${Date.now()}`;
    const optimisticAssistantId = `local-assistant-${Date.now()}`;
    const now = new Date().toISOString();
    setMessages((items) => [...items,
      { id: optimisticUserId, conversation_id: conversationId, role: "user", content: text, created_at: now, status: "completed" },
      { id: optimisticAssistantId, conversation_id: conversationId, role: "assistant", content: "", created_at: now, status: "streaming" },
    ]);
    setGenerating(true);
    followStreamRef.current = true;
    const abortController = new AbortController();
    abortRef.current = abortController;
    let accepted = false;

    try {
      const response = await fetch("/api/agents/research/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, agentId: "research", message: text, mode }),
        signal: abortController.signal,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as ApiFailure;
        throw new Error(payload.error?.message ?? "The response could not be started.");
      }
      if (!response.body) throw new Error("Streaming is unavailable in this browser.");

      accepted = true;
      setDraft("");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      while (!finished) {
        const chunk = await reader.read();
        finished = chunk.done;
        buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !finished });
        const parsed = parseSseBuffer(buffer);
        buffer = parsed.remainder;
        for (const item of parsed.events) {
          if (item.type === "ready") {
            setUsage(item.usage);
            setMessages((rows) => rows.map((row) => row.id === optimisticUserId ? { ...row, id: item.userMessageId } : row));
            if (item.title) {
              setConversations((rows) => rows.map((row) => row.id === conversationId ? { ...row, title: item.title!, updated_at: now } : row));
            }
          } else if (item.type === "delta") {
            setMessages((rows) => rows.map((row) => row.id === optimisticAssistantId ? { ...row, content: row.content + item.delta } : row));
          } else if (item.type === "complete") {
            setMessages((rows) => rows.map((row) => row.id === optimisticAssistantId
              ? { ...row, id: item.assistantMessageId, created_at: item.createdAt, status: "completed" }
              : row));
          } else if (item.type === "aborted") {
            setMessages((rows) => rows.map((row) => row.id === optimisticAssistantId ? { ...row, status: "aborted" } : row));
          } else if (item.type === "error") {
            setMessages((rows) => rows.map((row) => row.id === optimisticAssistantId ? { ...row, status: "failed" } : row));
            setError(item.message);
          }
        }
      }
    } catch (reason) {
      const abortedByUser = abortController.signal.aborted;
      if (!abortedByUser) abortController.abort();
      setMessages((rows) => rows
        .filter((row) => accepted || (row.id !== optimisticUserId && row.id !== optimisticAssistantId))
        .map((row) => row.id === optimisticAssistantId ? { ...row, status: abortedByUser ? "aborted" : "failed" } : row));
      if (!accepted) setDraft(text);
      if (!abortedByUser) setError(reason instanceof Error ? reason.message : "Network connection lost. Please try again.");
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  function stopGeneration() {
    abortRef.current?.abort();
    setGenerating(false);
  }

  function handleScroll() {
    const node = chatRef.current;
    if (!node) return;
    followStreamRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100;
  }

  async function copyMessage(message: ChatMessage) {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <main className="research-page">
      <aside className={`research-sidebar${drawerOpen ? " open" : ""}`} aria-label={t.history}>
        <div className="research-sidebar-head">
          <Link className="research-brand" href={zh ? "/portal?lang=zh" : "/portal"}>
            <Image src="/brand/wordmark-white.png" alt="R&Y Capital" width={346} height={109} />
            <span>{t.back}</span>
          </Link>
          <button className="research-drawer-close" type="button" onClick={() => setDrawerOpen(false)} aria-label={t.close}>×</button>
        </div>
        <button className="research-new" type="button" onClick={() => void createConversation().catch((reason: Error) => setError(reason.message))}>
          <span>＋</span>{t.newConversation}
        </button>
        <p className="research-history-label">{t.history}</p>
        <div className="research-history">
          {!loading && conversations.length === 0 && <p className="research-history-empty">{t.emptyHistory}</p>}
          {conversations.map((conversation) => (
            <div className={`research-history-row${activeId === conversation.id ? " active" : ""}`} key={conversation.id}>
              <button type="button" onClick={() => void loadMessages(conversation.id).catch((reason: Error) => setError(reason.message))}>
                <span>{conversation.title}</span>
                <small>{new Date(conversation.updated_at).toLocaleDateString(zh ? "zh-CN" : "en-AU", { day: "numeric", month: "short" })}</small>
              </button>
              <div>
                <button type="button" onClick={() => void renameConversation(conversation)} aria-label={`${t.rename}: ${conversation.title}`}>✎</button>
                <button type="button" onClick={() => void deleteConversation(conversation)} aria-label={`${t.remove}: ${conversation.title}`}>×</button>
              </div>
            </div>
          ))}
        </div>
        <div className="research-account">
          <LanguageSwitch language={language} englishHref="/portal/agents/research" chineseHref="/portal/agents/research?lang=zh" compact />
          <p>{email}</p>
          <form action={logout}>
            <input type="hidden" name="language" value={language} />
            <button type="submit">{zh ? "安全退出" : "Secure logout"}</button>
          </form>
        </div>
      </aside>
      {drawerOpen && <button className="research-backdrop" type="button" onClick={() => setDrawerOpen(false)} aria-label={t.close} />}

      <section className="research-main">
        <header className="research-header">
          <button className="research-menu" type="button" onClick={() => setDrawerOpen(true)} aria-label={t.menu}>☰</button>
          <div>
            <p>R&amp;Y Private Portal</p>
            <h1>{t.title}</h1>
          </div>
          <div className="research-header-controls">
            <div className="research-mode-switch" role="group" aria-label={zh ? "研究模式" : "Research mode"}>
              <button
                type="button"
                className={mode === "luna" ? "active" : ""}
                onClick={() => setMode("luna")}
                aria-pressed={mode === "luna"}
                disabled={generating}
              >
                <strong>{t.luna}</strong>
                <small>{t.lunaDescription}</small>
              </button>
              <button
                type="button"
                className={mode === "terra" ? "active" : ""}
                onClick={() => setMode("terra")}
                aria-pressed={mode === "terra"}
                disabled={generating}
              >
                <strong>{t.terra}</strong>
                <small>{t.terraDescription}</small>
              </button>
            </div>
            <span>{t.ready}</span>
          </div>
        </header>

        <div className="research-chat" ref={chatRef} onScroll={handleScroll} aria-live="polite">
          {messages.length === 0 ? (
            <div className="research-empty">
              <Image src="/brand/monogram-slate.png" alt="" width={495} height={411} />
              <p className="access-eyebrow">Private research workspace</p>
              <h2>{t.title}</h2>
              <p>{t.subtitle}</p>
            </div>
          ) : (
            <div className="research-messages">
              {messages.map((message) => (
                <article className={`research-message ${message.role} ${message.status}`} key={message.id}>
                  <div className="research-message-meta">
                    <span>{message.role === "assistant" ? "R&Y Research" : zh ? "您" : "You"}</span>
                    <time>{new Date(message.created_at).toLocaleTimeString(zh ? "zh-CN" : "en-AU", { hour: "2-digit", minute: "2-digit" })}</time>
                  </div>
                  {message.role === "assistant" ? (
                    <div className="research-markdown">
                      {message.content ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => {
                              const safe = safeHref(href);
                              return safe ? <a href={safe} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>;
                            },
                          }}
                        >{message.content}</ReactMarkdown>
                      ) : message.status === "streaming" ? <span className="research-typing"><i /><i /><i /></span> : null}
                      {message.status === "aborted" && <p className="research-message-status">Generation stopped.</p>}
                      {message.status === "failed" && <p className="research-message-status">Response incomplete. Your message remains saved.</p>}
                    </div>
                  ) : <p className="research-user-text">{message.content}</p>}
                  {message.role === "assistant" && message.content && message.status === "completed" && (
                    <button className="research-copy" type="button" onClick={() => void copyMessage(message)}>
                      {copiedId === message.id ? t.copied : t.copy}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="research-composer-wrap">
          {error && <p className="research-error" role="alert">{error}</p>}
          <form className="research-composer" onSubmit={(event) => void sendMessage(event)}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder={t.placeholder}
              maxLength={20_000}
              rows={2}
              disabled={generating}
              aria-label={t.placeholder}
            />
            {generating
              ? <button className="research-stop" type="button" onClick={stopGeneration}>{t.stop}</button>
              : <button type="submit" disabled={!draft.trim()}>{t.send}<span>↗</span></button>}
          </form>
          <div className="research-composer-meta"><p>{t.notice}</p>{usage && <span>{usage.used} / {usage.limit} {zh ? "今日消息" : "messages today"}</span>}</div>
        </div>
      </section>
    </main>
  );
}
