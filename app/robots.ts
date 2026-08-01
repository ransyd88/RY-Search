import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/login/",
        "/portal",
        "/portal/",
        "/portal/*",
        "/api/agents/",
        "/api/agents/*",
        "/auth/",
        "/auth/*",
        "/callback",
        "/password-reset",
        "/reset-password",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
