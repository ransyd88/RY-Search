import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LanguageSwitch, type SiteLanguage } from "@/components/LanguageSwitch";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private Access | R&Y Capital",
  description: "Secure private access for authorised R&Y Capital users.",
  robots: "noindex, nofollow, noarchive",
  alternates: null,
  openGraph: null,
  twitter: null,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ loggedOut?: string; lang?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const params = await searchParams;
  const language: SiteLanguage = params.lang === "zh" ? "zh" : "en";
  const zh = language === "zh";

  return (
    <main className="login-page">
      <div className="login-rule login-rule--top" />
      <Link
        className="login-home"
        href={zh ? "/?lang=zh" : "/"}
        aria-label={zh ? "返回 R&Y Capital" : "Return to R and Y Capital"}
      >
        <Image
          className="login-wordmark-image"
          src="/brand/wordmark-slate.png"
          alt="R&Y Capital"
          width={346}
          height={109}
        />
      </Link>
      <div className="login-language">
        <LanguageSwitch
          language={language}
          englishHref="/login"
          chineseHref="/login?lang=zh"
          compact
        />
      </div>

      <section className="login-panel">
        <p className="access-eyebrow">{zh ? "仅限授权用户" : "Authorised users only"}</p>
        <h1>{zh ? "私人访问" : "Private Access"}</h1>
        <p className="login-intro">
          {zh
            ? "安全进入 R&Y Capital 私人工具与资源。"
            : "A secure entry point for R&Y Capital's private tools and resources."}
        </p>

        {params.loggedOut === "1" && (
          <p className="login-success" role="status">
            {zh ? "你已安全退出。" : "You have been securely signed out."}
          </p>
        )}

        <LoginForm configured={configured} language={language} />

        <p className="login-help">
          {zh
            ? "仅限受邀用户。账户由管理员创建。"
            : "Access is invitation-only. Accounts are created by an administrator."}
        </p>
      </section>

      <div className="login-aside" aria-hidden="true">
        <span>{zh ? "为长期而生" : "Built for the Long Term"}</span>
        <i />
        <small>{zh ? "澳大利亚 · 悉尼" : "Sydney, Australia"}</small>
      </div>
      <div className="login-rule login-rule--bottom" />
    </main>
  );
}
