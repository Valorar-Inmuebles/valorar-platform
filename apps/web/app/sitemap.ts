import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/config/site";
import { getAllPublicPropertySlugs } from "@/lib/api/public-property";
import { STATIC_SITEMAP_ROUTES } from "@/lib/seo/sitemap-routes";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { siteUrl } = getSiteConfig();
  const propertySlugs = await getAllPublicPropertySlugs();
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_SITEMAP_ROUTES.map(
    (route) => ({
      url: `${siteUrl}${route.path}`,
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }),
  );

  const propertyEntries: MetadataRoute.Sitemap = propertySlugs.map((slug) => ({
    url: `${siteUrl}/propiedades/${slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...propertyEntries];
}
