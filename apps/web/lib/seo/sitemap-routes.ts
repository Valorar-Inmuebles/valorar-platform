import type { MetadataRoute } from "next";

type SitemapRoute = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

export const STATIC_SITEMAP_ROUTES: SitemapRoute[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/propiedades", changeFrequency: "daily", priority: 0.9 },
  { path: "/servicios", changeFrequency: "monthly", priority: 0.5 },
  { path: "/nosotros", changeFrequency: "monthly", priority: 0.5 },
  {
    path: "/asesoramiento-juridico",
    changeFrequency: "monthly",
    priority: 0.5,
  },
  { path: "/contacto", changeFrequency: "monthly", priority: 0.5 },
];
