"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import SydneyCapitalCanvas from "@/components/SydneyCapitalCanvas";
import { organizationStructuredData } from "@/lib/site-config";

type HomeLanguage = "en" | "zh";

const homeContent = {
  en: {
    nav: ["About", "Focus", "Principles", "Contact"],
    navigate: "Navigate",
    privateAccess: "Private Access",
    location: "Sydney, Australia",
    heroTitle: ["Built for the", "Long Term"],
    heroLead: "A privately held investment company based in Sydney.",
    heroNote:
      "Investing proprietary capital with patience, discipline and a long-term perspective.",
    discover: "Discover R&Y",
    imageCaption: "Stone / Glass / Natural light",
    scroll: "Scroll",
    aboutLabel: "About",
    aboutTitle: ["Private Capital.", "Long-Term Perspective."],
    aboutCopy: [
      "R&Y Capital is a privately held investment company based in Sydney.",
      "We invest and manage proprietary capital with a long-term perspective, focused across property, public markets, private credit and private enterprise.",
      "Our approach is patient, selective and independent.",
    ],
    focusLabel: "Focus",
    focusTitle: "Investment Focus",
    focusIntro: "A selective approach across a focused range of asset classes.",
    focusItems: [
      ["Property", "Long-term ownership and selective investment in quality real estate."],
      ["Public Markets", "Disciplined exposure to equities, funds and global markets."],
      ["Private Credit", "Selective, asset-backed opportunities with a focus on capital protection."],
      ["Private Enterprise", "Long-term investment in established businesses and selected private opportunities."],
    ],
    principlesLabel: "Principles",
    principlesTitle: "Our Principles",
    principlesIntro: "The qualities that guide our decisions across generations.",
    principles: [
      ["Long-Term Perspective", "We favour patience, resilience and enduring value over short-term movement."],
      ["Disciplined Allocation", "Every decision is considered through the lens of risk, quality and preservation of capital."],
      ["Independent Ownership", "Private ownership allows us to make thoughtful decisions with clarity and conviction."],
    ],
    closing: ["Built with patience.", "Managed with discipline.", "Held for the long term."],
    tagline: "Built for the Long Term",
    enquiries: "Enquiries",
    disclaimer:
      "R&Y Capital is a privately held investment company investing proprietary capital. It does not solicit investment from the public or provide financial advice.",
    rights: "© 2026 R&Y Capital. All rights reserved.",
    privacy: "Privacy",
    terms: "Terms",
  },
  zh: {
    nav: ["关于我们", "投资方向", "投资原则", "联系我们"],
    navigate: "导航",
    privateAccess: "私人访问",
    location: "澳大利亚 · 悉尼",
    heroTitle: ["立足长远", "恒久致远"],
    heroLead: "一家总部位于悉尼的私人投资公司。",
    heroNote: "以耐心、纪律与长期视角管理和投资自有资本。",
    discover: "了解 R&Y",
    imageCaption: "石材 / 玻璃 / 自然光",
    scroll: "向下",
    aboutLabel: "关于我们",
    aboutTitle: ["私人资本。", "长期视角。"],
    aboutCopy: [
      "R&Y Capital 是一家总部位于悉尼的私人投资公司。",
      "我们以长期视角管理和投资自有资本，重点布局房地产、公开市场、私人信贷及私人企业。",
      "我们坚持耐心、审慎与独立判断。",
    ],
    focusLabel: "投资方向",
    focusTitle: "投资重点",
    focusIntro: "专注于精选资产类别，坚持审慎配置。",
    focusItems: [
      ["房地产", "长期持有并精选投资优质房地产资产。"],
      ["公开市场", "以纪律化方式配置股票、基金及全球市场。"],
      ["私人信贷", "精选资产支持型机会，注重资本保护。"],
      ["私人企业", "长期投资成熟企业及经过筛选的非公开机会。"],
    ],
    principlesLabel: "投资原则",
    principlesTitle: "我们的原则",
    principlesIntro: "指引我们跨越世代作出决策的核心准则。",
    principles: [
      ["长期主义", "我们重视耐心、韧性与持久价值，不追逐短期波动。"],
      ["纪律配置", "每项决策均从风险、质量与资本保护的角度审慎评估。"],
      ["独立持有", "私人所有权让我们能够以清晰判断与坚定信念作出长远决策。"],
    ],
    closing: ["以耐心构筑。", "以纪律管理。", "为长期持有。"],
    tagline: "为长期而生",
    enquiries: "业务咨询",
    disclaimer:
      "R&Y Capital 是一家管理和投资自有资本的私人投资公司，不向公众募集投资，也不提供财务建议。",
    rights: "© 2026 R&Y Capital。保留所有权利。",
    privacy: "隐私",
    terms: "条款",
  },
} as const;

const navIds = ["about", "focus", "principles", "contact"] as const;
const focusImages = [
  "/images/hero-architecture.jpg",
  "/images/concrete-facade.jpg",
  "/images/blue-facade.jpg",
  "/images/hero-architecture.jpg",
];

function BrandMark({
  compact = false,
  tone = "slate",
}: {
  compact?: boolean;
  tone?: "slate" | "gold" | "white";
}) {
  return (
    <Image
      className={`brand-mark-image ${compact ? "brand-mark-image--compact" : ""}`}
      src={`/brand/monogram-${tone}.png`}
      alt=""
      aria-hidden="true"
      width={495}
      height={411}
    />
  );
}

function BrandWordmark({
  tone = "slate",
  className = "",
}: {
  tone?: "slate" | "gold" | "white";
  className?: string;
}) {
  return (
    <Image
      className={`brand-wordmark-image ${className}`}
      src={`/brand/wordmark-${tone}.png`}
      alt="R&Y Capital"
      width={346}
      height={109}
    />
  );
}

export default function Home() {
  const [language, setLanguage] = useState<HomeLanguage>("en");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("about");
  const heroRef = useRef<HTMLElement>(null);
  const content = homeContent[language];
  const navItems = navIds.map((id, index) => ({ id, label: content.nav[index] }));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedLanguage = params.get("lang");
    const savedLanguage = window.localStorage.getItem("ry-language");
    const nextLanguage: HomeLanguage =
      requestedLanguage === "zh" || (!requestedLanguage && savedLanguage === "zh") ? "zh" : "en";
    queueMicrotask(() => setLanguage(nextLanguage));
    document.documentElement.lang = nextLanguage === "zh" ? "zh-CN" : "en";
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);

      const marker = window.scrollY + window.innerHeight * 0.42;
      let active = "about";
      navIds.forEach((id) => {
        const section = document.getElementById(id);
        if (section && section.offsetTop <= marker) active = id;
      });
      setActiveSection(active);

      if (heroRef.current) {
        const progress = Math.min(window.scrollY / window.innerHeight, 1);
        heroRef.current.style.setProperty("--hero-shift", `${progress * -48}px`);
        heroRef.current.style.setProperty("--hero-opacity", `${1 - progress * 0.72}`);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.16 },
    );

    document.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const changeLanguage = (nextLanguage: HomeLanguage) => {
    setLanguage(nextLanguage);
    setMenuOpen(false);
    window.localStorage.setItem("ry-language", nextLanguage);
    document.documentElement.lang = nextLanguage === "zh" ? "zh-CN" : "en";
    const url = new URL(window.location.href);
    if (nextLanguage === "zh") {
      url.searchParams.set("lang", "zh");
    } else {
      url.searchParams.delete("lang");
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    event.currentTarget.style.setProperty("--parallax-x", `${x * 12}px`);
    event.currentTarget.style.setProperty("--parallax-y", `${y * 10}px`);
  };

  return (
    <main className={language === "zh" ? "language-zh" : "language-en"}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <header className={`site-header ${scrolled ? "site-header--scrolled" : ""}`}>
        <a className="nav-logo" href="#top" aria-label="R and Y Capital home">
          <BrandWordmark className="brand-wordmark-image--nav" />
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={activeSection === item.id ? "active" : ""}
              onClick={() => scrollTo(item.id)}
            >
              {item.label}
            </button>
          ))}
          <a className="private-access-link" href={language === "zh" ? "/login?lang=zh" : "/login"}>
            {content.privateAccess}
          </a>
          <div className="language-switch language-switch--header" aria-label={language === "zh" ? "语言选择" : "Language selection"}>
            <button className={language === "en" ? "active" : ""} onClick={() => changeLanguage("en")} lang="en">EN</button>
            <span aria-hidden="true" />
            <button className={language === "zh" ? "active" : ""} onClick={() => changeLanguage("zh")} lang="zh-CN">中文</button>
          </div>
        </nav>

        <button
          className={`menu-toggle ${menuOpen ? "is-open" : ""}`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>

        <div className={`mobile-menu ${menuOpen ? "is-open" : ""}`}>
          <span className="eyebrow">{content.navigate}</span>
          {navItems.map((item, index) => (
            <button
              key={item.id}
              style={{ "--item-delay": `${index * 70}ms` } as React.CSSProperties}
              onClick={() => scrollTo(item.id)}
            >
              <span>0{index + 1}</span>
              {item.label}
            </button>
          ))}
          <a
            className="mobile-private-access"
            href={language === "zh" ? "/login?lang=zh" : "/login"}
            style={{ "--item-delay": `${navItems.length * 70}ms` } as React.CSSProperties}
          >
            <span>05</span>
            {content.privateAccess}
          </a>
          <div className="mobile-language-switch language-switch" style={{ "--item-delay": `${(navItems.length + 1) * 70}ms` } as React.CSSProperties}>
            <button className={language === "en" ? "active" : ""} onClick={() => changeLanguage("en")} lang="en">EN</button>
            <span aria-hidden="true" />
            <button className={language === "zh" ? "active" : ""} onClick={() => changeLanguage("zh")} lang="zh-CN">中文</button>
          </div>
        </div>
      </header>

      <section
        id="top"
        ref={heroRef}
        className="hero"
        onPointerMove={handlePointerMove}
        onPointerLeave={(event) => {
          event.currentTarget.style.setProperty("--parallax-x", "0px");
          event.currentTarget.style.setProperty("--parallax-y", "0px");
        }}
      >
        <div className="hero-grain" />
        <div className="hero-copy">
          <div className="hero-brand" aria-label="R and Y Capital">
            <BrandWordmark className="brand-wordmark-image--hero" />
          </div>
          <p className="eyebrow hero-location">{content.location}</p>
          <h1>
            <span>{content.heroTitle[0]}</span>
            <span>{content.heroTitle[1]}</span>
          </h1>
          <p className="hero-lead">{content.heroLead}</p>
          <p className="hero-note">{content.heroNote}</p>
          <button className="outline-button" onClick={() => scrollTo("about")}>
            {content.discover} <span aria-hidden="true">↘</span>
          </button>
        </div>

        <div className="hero-visual">
          <div className="hero-image-wrap">
            <Image
              src="/images/hero-architecture.jpg"
              alt={
                language === "zh"
                  ? "自然光下的现代石材与玻璃建筑"
                  : "Contemporary stone and glass architecture in natural light"
                }
              width={1800}
              height={3198}
              priority
            />
            <SydneyCapitalCanvas language={language} />
            <span className="image-caption">{content.imageCaption}</span>
          </div>
          <div className="hero-line" />
          <span className="hero-index">01 — 04</span>
        </div>

        <button
          className="scroll-cue"
          onClick={() => scrollTo("about")}
          aria-label={language === "zh" ? "滚动到关于我们" : "Scroll to About"}
        >
          <span>{content.scroll}</span>
          <i />
        </button>
      </section>

      <section id="about" className="about section-shell">
        <Image
          className="watermark"
          src="/brand/monogram-slate.png"
          alt=""
          aria-hidden="true"
          width={495}
          height={411}
          loading="lazy"
          decoding="async"
        />
        <div className="section-label" data-reveal>
          <span>01</span>
          <p>{content.aboutLabel}</p>
        </div>
        <div className="about-grid">
          <h2 data-reveal>
            <span>{content.aboutTitle[0]}</span>
            <span>{content.aboutTitle[1]}</span>
          </h2>
          <div className="about-copy">
            <p data-reveal>{content.aboutCopy[0]}</p>
            <p data-reveal>{content.aboutCopy[1]}</p>
            <p data-reveal>{content.aboutCopy[2]}</p>
          </div>
        </div>
        <div className="draw-line" data-reveal />
      </section>

      <section id="focus" className="focus">
        <div className="section-shell">
          <div className="section-heading" data-reveal>
            <div className="section-label">
              <span>02</span>
              <p>{content.focusLabel}</p>
            </div>
            <div>
              <h2>{content.focusTitle}</h2>
              <p>{content.focusIntro}</p>
            </div>
          </div>
        </div>

        <div className="focus-list">
          {content.focusItems.map((item, index) => (
            <article className="focus-row" key={item[0]} data-reveal>
              <Image
                src={focusImages[index]}
                alt=""
                width={index === 0 || index === 3 ? 1800 : 1600}
                height={index === 0 || index === 3 ? 3198 : 2400}
                loading="lazy"
                decoding="async"
              />
              <div className="focus-overlay" />
              <div className="focus-inner section-shell">
                <span className="focus-number">0{index + 1}</span>
                <h3>{item[0]}</h3>
                <p>{item[1]}</p>
                <span className="focus-arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="principles" className="principles section-shell">
        <div className="section-heading" data-reveal>
          <div className="section-label">
              <span>03</span>
              <p>{content.principlesLabel}</p>
            </div>
            <div>
            <h2>{content.principlesTitle}</h2>
            <p>{content.principlesIntro}</p>
          </div>
        </div>

        <div className="principles-grid">
          {content.principles.map((principle, index) => (
            <article key={principle[0]} data-reveal>
              <span>0{index + 1}</span>
              <div className="principle-line" />
              <h3>{principle[0]}</h3>
              <p>{principle[1]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="closing">
        <div className="closing-image" aria-hidden="true" />
        <div className="closing-shade" />
        <div className="closing-inner section-shell">
          <p className="eyebrow" data-reveal>
            R&amp;Y Capital
          </p>
          <h2 data-reveal>
            <span>{content.closing[0]}</span>
            <span>{content.closing[1]}</span>
            <span>{content.closing[2]}</span>
          </h2>
          <div className="closing-meta" data-reveal>
            <BrandMark compact tone="white" />
            <span>{content.location}</span>
          </div>
        </div>
      </section>

      <footer id="contact" className="footer section-shell">
        <div className="footer-top">
          <a className="footer-brand" href="#top">
            <BrandWordmark />
            <span>
              <small>{content.tagline}</small>
            </span>
          </a>
          <div className="footer-contact">
            <p>{content.enquiries}</p>
            <a href="mailto:info@rycapital.com.au">info@rycapital.com.au</a>
            <span>{content.location}</span>
          </div>
        </div>
        <div className="footer-bottom">
          <p>{content.disclaimer}</p>
          <div className="footer-legal">
            <span>{content.rights}</span>
            <a href="#contact">{content.privacy}</a>
            <a href="#contact">{content.terms}</a>
            <a href={language === "zh" ? "/login?lang=zh" : "/login"}>{content.privateAccess}</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
