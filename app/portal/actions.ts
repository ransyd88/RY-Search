"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function logout(formData: FormData) {
  const language = formData.get("language") === "zh" ? "zh" : "en";
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    await supabase.auth.signOut({ scope: "local" });
  }

  redirect(language === "zh" ? "/login?loggedOut=1&lang=zh" : "/login?loggedOut=1");
}
