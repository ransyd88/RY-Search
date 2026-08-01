"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifyLoginTurnstile } from "@/lib/turnstile";

export type LoginState = {
  error: string | null;
  attempt: number;
};

export async function login(
  previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const language = formData.get("language") === "zh" ? "zh" : "en";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const turnstileToken = String(formData.get("cf-turnstile-response") ?? "");
  const attempt = previousState.attempt + 1;

  if (!email || !password) {
    return {
      error: language === "zh" ? "请输入邮箱地址和密码。" : "Enter your email address and password.",
      attempt,
    };
  }

  const requestHeaders = await headers();
  const remoteIp = requestHeaders.get("cf-connecting-ip")
    ?? requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const human = await verifyLoginTurnstile(turnstileToken, remoteIp);
  if (!human) {
    return {
      error: language === "zh"
        ? "安全验证未完成或已过期，请重试。"
        : "Security verification was not completed or has expired. Please try again.",
      attempt,
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      error: language === "zh"
        ? "私人访问尚未完成配置，请联系管理员。"
        : "Private Access is not configured yet. Please contact the administrator.",
      attempt,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error: language === "zh"
        ? "邮箱地址或密码不正确。"
        : "The email address or password was not accepted.",
      attempt,
    };
  }

  redirect(language === "zh" ? "/portal?lang=zh" : "/portal");
}
