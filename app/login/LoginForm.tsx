"use client";

import { useActionState } from "react";
import type { SiteLanguage } from "@/components/LanguageSwitch";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm({
  configured,
  language,
}: {
  configured: boolean;
  language: SiteLanguage;
}) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const zh = language === "zh";

  return (
    <form className="login-form" action={formAction}>
      <input type="hidden" name="language" value={language} />
      <label>
        <span>{zh ? "邮箱地址" : "Email address"}</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          disabled={!configured || pending}
        />
      </label>

      <label>
        <span>{zh ? "密码" : "Password"}</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          disabled={!configured || pending}
        />
      </label>

      <div className="login-form-status" aria-live="polite">
        {!configured
          ? zh
            ? "完成 Supabase 配置后才能登录。"
            : "Supabase configuration is required before sign-in is available."
          : state.error}
      </div>

      <button type="submit" disabled={!configured || pending}>
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
