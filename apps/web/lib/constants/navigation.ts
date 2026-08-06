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
  { label: "Propiedades", href: "/propiedades" },
  { label: "Emprendimientos", href: "/emprendimientos" },
  { label: "Servicios", href: "/servicios" },
  { label: "Asesoramiento Jurídico", href: "/asesoramiento-juridico" },
];

export const FOOTER_INSTITUTIONAL_ITEMS: NavItem[] = [
  { label: "Nosotros", href: "/nosotros" },
  { label: "Contacto", href: "/contacto" },
  { label: "Cumplimiento de la Ley N° 5115", href: "/ley-5115" },
  { label: "Cumplimiento de la Ley N° 5859", href: "/ley-5859" },
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
  whatsapp: "114-473-6714",
  email: "info@valorarinmuebles.com.ar",
  hours: "Lun. a Vie. de 10 a 19 hs.\nSáb. de 10 a 13 hs.",
};

export const FOOTER_DESCRIPTION =
  "Desde 1999 siendo testigos del crecimiento de nuestro barrio. Nuestro trabajo es claro y preciso, nuestro dinamismo hará su sueño realidad.";
