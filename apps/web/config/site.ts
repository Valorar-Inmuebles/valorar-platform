import type { Metadata } from "next";

export type SiteConfig = {
  companyName: string;
  siteUrl: string;
  description: string;
  whatsapp: string;
  email: string;
  phone: string;
  address: string;
  primaryColor: string;
  secondaryColor: string;
  social: {
    facebook: string;
    instagram: string;
    linkedin: string;
  };
};

export function getSiteConfig(): SiteConfig {
  return {
    companyName: process.env.PUBLIC_COMPANY_NAME ?? "Valorar Inmuebles",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    description:
      process.env.PUBLIC_SITE_DESCRIPTION ??
      "Inmuebles, alquileres, ventas y emprendimientos.",
    whatsapp: process.env.PUBLIC_WHATSAPP ?? "",
    email: process.env.PUBLIC_EMAIL ?? "contacto@inmobiliaria.com",
    phone: process.env.PUBLIC_PHONE ?? "+54 11 0000-0000",
    address:
      process.env.PUBLIC_ADDRESS ?? "Av. Ejemplo 1234, Buenos Aires, Argentina",
    primaryColor: process.env.PUBLIC_PRIMARY_COLOR ?? "#1e3a5f",
    secondaryColor: process.env.PUBLIC_SECONDARY_COLOR ?? "#c9a227",
    social: {
      facebook: process.env.PUBLIC_FACEBOOK_URL ?? "",
      instagram: process.env.PUBLIC_INSTAGRAM_URL ?? "",
      linkedin: process.env.PUBLIC_LINKEDIN_URL ?? "",
    },
  };
}

export function createSiteMetadata(overrides?: Partial<Metadata>): Metadata {
  const site = getSiteConfig();

  return {
    metadataBase: new URL(site.siteUrl),
    title: {
      default: site.companyName,
      template: `%s | ${site.companyName}`,
    },
    description: site.description,
    openGraph: {
      type: "website",
      locale: "es_AR",
      url: site.siteUrl,
      siteName: site.companyName,
      title: site.companyName,
      description: site.description,
      images: [
        {
          url: "/brand/logo-512.png",
          width: 512,
          height: 512,
          alt: site.companyName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: site.companyName,
      description: site.description,
    },
    robots: {
      index: true,
      follow: true,
    },
    ...overrides,
  };
}
