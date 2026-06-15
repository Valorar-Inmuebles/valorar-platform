import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const { siteUrl } = getSiteConfig();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
