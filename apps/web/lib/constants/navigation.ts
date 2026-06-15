export type NavItem = {
  label: string;
  href: string;
};

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Inicio", href: "/" },
  { label: "Propiedades", href: "/propiedades" },
  { label: "Emprendimientos", href: "/emprendimientos" },
  { label: "Servicios", href: "/servicios" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Asesoramiento Jurídico", href: "/asesoramiento-juridico" },
  { label: "Contacto", href: "/contacto" },
];

export const FOOTER_NAV_ITEMS: NavItem[] = [
  { label: "Inicio", href: "/" },
  { label: "Propiedades", href: "/propiedades" },
  { label: "Emprendimientos", href: "/emprendimientos" },
  { label: "Contacto", href: "/contacto" },
];

export const FOOTER_SERVICE_ITEMS: NavItem[] = [
  { label: "Servicios", href: "/servicios" },
  { label: "Asesoramiento Jurídico", href: "/asesoramiento-juridico" },
  { label: "Nosotros", href: "/nosotros" },
];

export type SocialLink = {
  label: string;
  href: string;
  icon: "facebook" | "instagram" | "linkedin";
};

export const FOOTER_SOCIAL_LINKS: SocialLink[] = [
  {
    label: "Facebook",
    href: "https://facebook.com/",
    icon: "facebook",
  },
  {
    label: "Instagram",
    href: "https://instagram.com/",
    icon: "instagram",
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/",
    icon: "linkedin",
  },
];

export const FOOTER_CONTACT = {
  phone: "+54 11 0000-0000",
  email: "contacto@inmobiliaria.com",
  address: "Av. Ejemplo 1234, Buenos Aires, Argentina",
  hours: "Lunes a viernes, 9:00 – 18:00",
};

export const FOOTER_DESCRIPTION =
  "Tu inmobiliaria de confianza. Propiedades en venta, alquiler y emprendimientos.";
