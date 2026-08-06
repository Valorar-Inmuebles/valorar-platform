export const SERVICES_YEARS_EXPERIENCE = 25;

export const SERVICES_BENEFITS = [
  {
    title: "Experiencia inmobiliaria",
    description:
      "Más de dos décadas acompañando operaciones en Caballito y la Ciudad de Buenos Aires.",
  },
  {
    title: "Publicación en los principales portales",
    description:
      "Tu propiedad visible en los buscadores y portales que concentran la demanda del mercado.",
  },
  {
    title: "Asesoramiento integral",
    description:
      "Contable, jurídico, crediticio y técnico en un mismo equipo para resolver cada etapa.",
  },
  {
    title: "Atención personalizada",
    description:
      "Trato directo y cercano, con seguimiento dedicado según tu perfil y objetivos.",
  },
  {
    title: "Equipo multidisciplinario",
    description:
      "Profesionales especializados que trabajan de forma coordinada en cada operación.",
  },
  {
    title: "Seguimiento durante toda la operación",
    description:
      "Desde la primera consulta hasta la firma y más allá, con respaldo en cada paso.",
  },
] as const;

export type ServiceIconName =
  | "rental-admin"
  | "buy-sell"
  | "accounting"
  | "legal"
  | "credit"
  | "architecture"
  | "consortium"
  | "developers";

export type ServiceItem = {
  icon: ServiceIconName;
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
};

export const SERVICES_ITEMS: ServiceItem[] = [
  {
    icon: "rental-admin",
    title: "Administración de alquileres",
    description:
      "Búsqueda del perfil de un inquilino a base de demostración de ingresos, garantía adecuada, informes pertinentes, etc. Obtenga una renta segura y sin pérdida de tiempo con depósitos en su cuenta.",
  },
  {
    icon: "buy-sell",
    title: "Compra y venta de inmuebles",
    description:
      "Simplificamos operaciones encadenadas y unificamos criterios entre las partes. Te acompañamos en la venta y en la compra con trato profesional, hasta la firma de la escritura.",
  },
  {
    icon: "accounting",
    title: "Asesoramiento contable",
    description:
      "Cumplimiento de la Ley 19.550 de Sociedades y la Ley 24.441 de Fideicomisos en general.",
  },
  {
    icon: "legal",
    title: "Asesoramiento Jurídico",
    description:
      "Brindamos asesoramiento jurídico integral en busca de una mejor eficiencia en la toma de decisiones, con enfoque en derecho inmobiliario, sucesiones, contratos, previsional, accidentes de tránsito, consumidor y derecho administrativo.",
    href: "/asesoramiento-juridico",
    ctaLabel: "Más información →",
  },
  {
    icon: "credit",
    title: "Asesoramiento crediticio",
    description:
      "Si desea obtener información sobre condiciones vigentes y requisitos para calificar, consúltenos.",
  },
  {
    icon: "architecture",
    title: "Arquitectura",
    description:
      "Si desea comprar una propiedad para reciclar con el objetivo de modernizarla para luego revenderla y obtener una ganancia, contamos con un equipo de profesionales idóneos en la materia.",
  },
  {
    icon: "consortium",
    title: "Administración de consorcios",
    description:
      "Asesoramiento tanto a propietarios como administradores sobre los alcances de las normas de propiedad horizontal y decretos reglamentarios.",
  },
  {
    icon: "developers",
    title: "Servicios para desarrolladores y constructoras",
    description:
      "Búsqueda de terrenos. Análisis de mercado. Futuros inversores. Comercialización del proyecto en sus distintas etapas y asesoramiento integral.",
  },
];
