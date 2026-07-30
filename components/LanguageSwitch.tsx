export type SiteLanguage = "en" | "zh";

type LanguageSwitchProps = {
  language: SiteLanguage;
  englishHref: string;
  chineseHref: string;
  compact?: boolean;
};

export function LanguageSwitch({
  language,
  englishHref,
  chineseHref,
  compact = false,
}: LanguageSwitchProps) {
  return (
    <div
      className={`language-switch ${compact ? "language-switch--compact" : ""}`}
      aria-label={language === "zh" ? "语言选择" : "Language selection"}
    >
      <a className={language === "en" ? "active" : ""} href={englishHref} lang="en">
        EN
      </a>
      <span aria-hidden="true" />
      <a className={language === "zh" ? "active" : ""} href={chineseHref} lang="zh-CN">
        中文
      </a>
    </div>
  );
}
