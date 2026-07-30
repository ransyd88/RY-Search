import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LanguageSwitch, type SiteLanguage } from "@/components/LanguageSwitch";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "R&Y Private Portal",
  description: "Private tools and resources for authorised R&Y Capital users.",
  robots: { index: false, follow: false },
};

const portalContent = {
  en: {
    navigation: ["Overview", "AI Agents", "Internal Tools", "Documents", "Investment Workspace"],
    portalName: "Private Portal",
    logout: "Secure logout",
    mobileLogout: "Logout",
    eyebrow: "Private workspace",
    title: "R&Y Private Portal",
    subtitle: "Private tools and resources",
    signedIn: "Signed in",
    pending: "Configuration pending",
    confidential: "Private and confidential · Sydney, Australia",
    cards: [
      ["AI Agents", "R&Y Research Agent", "Research support across selected markets and investment themes."],
      ["AI Agents", "Property Review Agent", "A structured workspace for reviewing property opportunities."],
      ["AI Agents", "Private Credit Agent", "Focused support for asset-backed private credit assessment."],
      ["Internal Tools", "Market Briefing Agent", "A concise view of relevant market movements and developments."],
      ["Documents", "Document Library", "Controlled access to internal documents and reference material."],
      ["Investment Workspace", "Investment Dashboard", "A private overview of active investment workstreams."],
    ],
  },
  zh: {
    navigation: ["概览", "AI 智能体", "内部工具", "文件资料", "投资工作区"],
    portalName: "私人门户",
    logout: "安全退出",
    mobileLogout: "退出",
    eyebrow: "私人工作空间",
    title: "R&Y 私人门户",
    subtitle: "私人工具与资源",
    signedIn: "已登录",
    pending: "等待配置",
    confidential: "私人及保密 · 澳大利亚悉尼",
    cards: [
      ["AI 智能体", "R&Y 研究智能体", "协助研究精选市场与投资主题。"],
      ["AI 智能体", "房地产评估智能体", "用于评估房地产投资机会的结构化工作空间。"],
      ["AI 智能体", "私人信贷智能体", "专注支持资产抵押型私人信贷评估。"],
      ["内部工具", "市场简报智能体", "简明呈现相关市场动态与重要发展。"],
      ["文件资料", "文件资料库", "受控访问内部文件与参考资料。"],
      ["投资工作区", "投资仪表板", "私人查看当前投资工作流程。"],
    ],
  },
} as const;

// PLACEHOLDER_CONFIG: replace null href values with approved internal routes or
// external URLs when each private tool is ready.
export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const language: SiteLanguage = params.lang === "zh" ? "zh" : "en";
  const zh = language === "zh";
  const content = portalContent[language];
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect(zh ? "/login?lang=zh" : "/login");
  }

  // getUser performs a server-confirmed validation, including expiry and
  // revocation state. Do not replace this check with getSession().
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(zh ? "/login?lang=zh" : "/login");
  }

  return (
    <main className="portal-page">
      <aside className="portal-sidebar">
        <Link className="portal-brand" href={zh ? "/?lang=zh" : "/"}>
          <img className="portal-wordmark-image" src="/brand/wordmark-white.png" alt="R&Y Capital" />
          <span>
            <small>{content.portalName}</small>
          </span>
        </Link>

        <nav aria-label="Portal navigation">
          {content.navigation.map((item, index) => (
            <a className={index === 0 ? "active" : ""} href={index === 0 ? "#overview" : `#section-${index}`} key={item}>
              <span>0{index + 1}</span>
              {item}
            </a>
          ))}
        </nav>

        <div className="portal-account">
          <LanguageSwitch
            language={language}
            englishHref="/portal"
            chineseHref="/portal?lang=zh"
            compact
          />
          <p>{user.email}</p>
          <form action={logout}>
            <input type="hidden" name="language" value={language} />
            <button type="submit">{content.logout}</button>
          </form>
        </div>
      </aside>

      <header className="portal-mobile-header">
        <Link
          href={zh ? "/?lang=zh" : "/"}
          aria-label={zh ? "返回 R&Y Capital" : "Return to R and Y Capital"}
        >
          <img className="access-monogram-image" src="/brand/monogram-slate.png" alt="" />
        </Link>
        <LanguageSwitch
          language={language}
          englishHref="/portal"
          chineseHref="/portal?lang=zh"
          compact
        />
        <form action={logout}>
          <input type="hidden" name="language" value={language} />
          <button type="submit">{content.mobileLogout}</button>
        </form>
      </header>

      <section className="portal-content" id="overview">
        <div className="portal-intro">
          <div>
            <p className="access-eyebrow">{content.eyebrow}</p>
            <h1>{content.title}</h1>
            <p>{content.subtitle}</p>
          </div>
          <div className="portal-user">
            <span>{content.signedIn}</span>
            <p>{user.email}</p>
          </div>
        </div>

        <div className="portal-divider" />

        <div className="portal-grid">
          {content.cards.map((card, index) => (
            <article
              className="portal-card"
              id={`section-${Math.min(index + 1, 4)}`}
              key={card[1]}
              style={{ "--card-delay": `${index * 70}ms` } as React.CSSProperties}
            >
              <div className="portal-card-meta">
                <span>0{index + 1}</span>
                <p>{card[0]}</p>
              </div>
              <h2>{card[1]}</h2>
              <p>{card[2]}</p>
              <div className="portal-card-footer">
                <span>{content.pending}</span>
                <i aria-hidden="true">↗</i>
              </div>
            </article>
          ))}
        </div>

        <footer className="portal-footer">
          <span>R&amp;Y Capital</span>
          <p>{content.confidential}</p>
        </footer>
      </section>
    </main>
  );
}
