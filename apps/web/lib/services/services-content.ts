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
};

export const SERVICES_ITEMS: ServiceItem[] = [
  {
    icon: "rental-admin",
    title: "Administración de alquileres",
    description:
      "Gestionamos la búsqueda y selección de inquilinos, el cobro de rentas y el seguimiento del contrato. Validamos ingresos, garantías e informes para que obtengas una renta segura sin perder tiempo.",
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
      "Orientamos en transacciones desde el exterior, fideicomisos y trámites vinculados a tu operación. Te asesoramos sobre COTI, ITI y demás requisitos cuando aplican.",
  },
  {
    icon: "legal",
    title: "Asesoramiento jurídico / notarial",
    description:
      "Sucesiones, inhibiciones, estudios de título, escrituras, boletos y contratos. Contamos con profesionales para resolver cada etapa legal y notarial con seguridad.",
  },
  {
    icon: "credit",
    title: "Asesoramiento crediticio",
    description:
      "Información actualizada sobre condiciones y requisitos para calificar ante entidades bancarias de primera línea. Te ayudamos a evaluar opciones de financiación acordes a tu perfil.",
  },
  {
    icon: "architecture",
    title: "Arquitectura",
    description:
      "Si querés reciclar una propiedad o refaccionar para vender, te asesoramos en el potencial del inmueble y en las mejoras que maximizan su valor en el mercado.",
  },
  {
    icon: "consortium",
    title: "Administración de consorcios",
    description:
      "Orientación sobre la administración de consorcios y el cumplimiento normativo vigente. Te asesoramos para optimizar la gestión con buenas prácticas y criterio.",
  },
  {
    icon: "developers",
    title: "Servicios para desarrolladores y constructoras",
    description:
      "Búsqueda de terrenos, análisis de mercado, vinculación con inversores y comercialización del proyecto en cada etapa. Acompañamos a constructoras con visión integral del negocio.",
  },
];
