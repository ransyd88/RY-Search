export const siteConfig = {
  name: "R&Y Capital",
  title: "R&Y Capital | Sydney Family Investment Company",
  description:
    "R&Y Capital is a privately held family investment company based in Sydney, focused on long-term value across property, public markets, private credit and private enterprise.",
  url: "https://rycapital.com.au",
  canonicalUrl: "https://rycapital.com.au/",
  email: "info@rycapital.com.au",
  location: "Sydney, Australia",
  brandStatement: "Built for the Long Term",
  socialImage: "https://rycapital.com.au/brand/og-social.jpg",
  logo: "https://rycapital.com.au/brand/monogram-slate.png",
} as const;

export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.canonicalUrl,
  email: `mailto:${siteConfig.email}`,
  description: "R&Y Capital is a privately held family investment company based in Sydney.",
  logo: siteConfig.logo,
  areaServed: {
    "@type": "Place",
    name: siteConfig.location,
  },
} as const;
