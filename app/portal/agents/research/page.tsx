import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResearchAgentClient } from "./ResearchAgentClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "R&Y Research Agent",
  description: "Private research workspace for authorised R&Y Capital users.",
  robots: "noindex, nofollow, noarchive",
  alternates: null,
  openGraph: null,
  twitter: null,
};

export default async function ResearchAgentPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const language = (await searchParams).lang === "zh" ? "zh" : "en";
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(language === "zh" ? "/login?lang=zh" : "/login");

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(language === "zh" ? "/login?lang=zh" : "/login");

  return <ResearchAgentClient email={user.email ?? "Authorised user"} language={language} />;
}
