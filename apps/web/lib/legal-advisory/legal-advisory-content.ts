export const LEGAL_ADVISORY_HERO = {
  eyebrow: "Servicios",
  title: "Asesoramiento Jurídico",
  subtitle:
    "Acompañamiento legal integral para cada etapa de una operación inmobiliaria.",
  intro:
    "Te orientamos con criterio jurídico para que cada decisión inmobiliaria se tome con claridad, seguridad y respaldo profesional.",
};

export const LEGAL_ADVISORY_PRESENTATION = {
  title: "Respaldo legal en cada operación",
  description:
    "Ofrecemos asesoramiento jurídico integral orientado a una toma de decisiones más eficaz, con foco en asuntos inmobiliarios, societarios, propiedad intelectual y sucesorios.",
};

export type LegalAdvisoryAreaIconName =
  | "real-estate"
  | "succession"
  | "corporate"
  | "intellectual-property";

export const LEGAL_ADVISORY_AREAS: Array<{
  title: string;
  description: string;
  icon: LegalAdvisoryAreaIconName;
}> = [
  {
    title: "Operaciones inmobiliarias",
    description:
      "Asesoramiento durante procesos de compra, venta y alquiler.",
    icon: "real-estate",
  },
  {
    title: "Derecho sucesorio",
    description: "Orientación para operaciones vinculadas con sucesiones.",
    icon: "succession",
  },
  {
    title: "Derecho societario",
    description:
      "Asistencia en cuestiones jurídicas relacionadas con sociedades.",
    icon: "corporate",
  },
  {
    title: "Propiedad intelectual",
    description: "Consultas y orientación legal cuando corresponda.",
    icon: "intellectual-property",
  },
];

export const LEGAL_ADVISORY_BENEFITS = [
  {
    title: "Mayor seguridad jurídica",
    description:
      "Cada decisión con respaldo legal claro y documentado.",
  },
  {
    title: "Prevención de conflictos",
    description:
      "Anticipamos riesgos antes de que se conviertan en disputas.",
  },
  {
    title: "Acompañamiento profesional",
    description:
      "Un equipo jurídico que interviene en cada etapa relevante.",
  },
  {
    title: "Decisiones con mayor respaldo",
    description:
      "Información legal precisa para avanzar con confianza.",
  },
];

export const LEGAL_ADVISORY_COLLABORATION = {
  title: "Trabajo en conjunto",
  description:
    "El asesoramiento jurídico forma parte del acompañamiento integral de Valorar Inmuebles. Trabajamos de manera coordinada con el área inmobiliaria para que cada operación cuente con respaldo legal sin perder de vista el objetivo comercial.",
};

export const LEGAL_ADVISORY_CTA = {
  title: "¿Necesitás asesoramiento profesional?",
  description:
    "Escribinos y conversemos sobre tu consulta. Te orientamos con el respaldo jurídico que necesitás.",
};
