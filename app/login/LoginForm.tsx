"use client";

import { useActionState, useCallback, useState } from "react";
import type { SiteLanguage } from "@/components/LanguageSwitch";
import { login, type LoginState } from "./actions";
import { TurnstileWidget } from "./TurnstileWidget";

const initialState: LoginState = { error: null, attempt: 0 };

export function LoginForm({
  configured,
  language,
  turnstileSiteKey,
}: {
  configured: boolean;
  language: SiteLanguage;
  turnstileSiteKey: string;
}) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [turnstileToken, setTurnstileToken] = useState("");
  const setToken = useCallback((token: string) => setTurnstileToken(token), []);
  const zh = language === "zh";
  const ready = configured && Boolean(turnstileSiteKey);

  return (
    <form className="login-form" action={formAction}>
      <input type="hidden" name="language" value={language} />
      <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />
      <label>
        <span>{zh ? "邮箱地址" : "Email address"}</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          disabled={!ready || pending}
        />
      </label>

      <label>
        <span>{zh ? "密码" : "Password"}</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          disabled={!ready || pending}
        />
      </label>

      {turnstileSiteKey && (
        <TurnstileWidget
          attempt={state.attempt}
          disabled={pending}
          language={language}
          onToken={setToken}
          siteKey={turnstileSiteKey}
        />
      )}

      <div className="login-form-status" aria-live="polite">
        {!ready
          ? zh
            ? "完成 Supabase 与安全验证配置后才能登录。"
            : "Supabase and security verification must be configured before sign-in is available."
          : state.error}
      </div>

      <button type="submit" disabled={!ready || !turnstileToken || pending}>
        <span>
          {pending
            ? zh
              ? "正在验证…"
              : "Verifying…"
            : zh
              ? "进入私人门户"
              : "Enter Private Portal"}
        </span>
        <i aria-hidden="true">↗</i>
      </button>
    </form>
  );
}
