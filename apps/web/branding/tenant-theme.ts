import type { TenantTheme } from "./theme.types";

export const DEFAULT_TENANT_THEME: TenantTheme = {
  companyName: "Valorar Siempre Inmuebles",
  branding: {
    logo: "/brand/logo.png",
    logo48: "/brand/logo-48.png",
    logo180: "/brand/logo-180.png",
    logo192: "/brand/logo-192.png",
    logo512: "/brand/logo-512.png",
    favicon: "/brand/favicon.ico",
    favicon16: "/brand/favicon-16x16.png",
    favicon32: "/brand/favicon-32x32.png",
    hero: "/brand/valorar-inmuebles-hero.jpg",
  },
  colors: {
    brand: {
      green: "#15351d",
      orange: "#ee680f",
    },
    action: {
      primary: "#ee680f",
      secondary: "#15351d",
    },
  },
  typography: {
    headingFont: "Cormorant Garamond",
    bodyFont: "Inter",
  },
};
