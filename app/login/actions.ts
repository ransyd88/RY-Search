"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = {
  error: string | null;
};

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const language = formData.get("language") === "zh" ? "zh" : "en";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: language === "zh" ? "请输入邮箱地址和密码。" : "Enter your email address and password.",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      error:
        language === "zh"
          ? "私人访问尚未完成配置，请联系管理员。"
          : "Private Access is not configured yet. Please contact the administrator.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error:
        language === "zh"
          ? "邮箱地址或密码不正确。"
          : "The email address or password was not accepted.",
    };
  }

  redirect(language === "zh" ? "/portal?lang=zh" : "/portal");
}
