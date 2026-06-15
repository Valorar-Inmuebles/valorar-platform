import { getSiteConfig, type SiteConfig } from "@/config/site";

export function getPublicSiteConfig(): Omit<SiteConfig, never> {
  const config = getSiteConfig();

  return {
    companyName: config.companyName,
    siteUrl: config.siteUrl,
    description: config.description,
    whatsapp: config.whatsapp,
    email: config.email,
    phone: config.phone,
    address: config.address,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    social: config.social,
  };
}

export type PublicSiteConfig = ReturnType<typeof getPublicSiteConfig>;
