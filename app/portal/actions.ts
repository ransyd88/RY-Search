"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AUTH_PERSISTENCE_COOKIE } from "@/lib/supabase/auth-cookie";

export async function logout(formData: FormData) {
  const language = formData.get("language") === "zh" ? "zh" : "en";
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut({ scope: "local" });
  }

  const cookieStore = await cookies();
  cookieStore.delete(AUTH_PERSISTENCE_COOKIE);

  redirect(language === "zh" ? "/login?loggedOut=1&lang=zh" : "/login?loggedOut=1");
}
