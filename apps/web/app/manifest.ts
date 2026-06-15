import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/config/site";
import { BRAND_ASSETS } from "@/lib/constants/brand";

export default function manifest(): MetadataRoute.Manifest {
  const site = getSiteConfig();

  return {
    name: site.companyName,
    short_name: site.companyName,
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: site.primaryColor,
    lang: "es",
    icons: [
      {
        src: BRAND_ASSETS.logo192,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: BRAND_ASSETS.logo512,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
