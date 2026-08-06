import { SERVICES_YEARS_EXPERIENCE } from "@/lib/services/services-content";

export const ABOUT_YEARS_EXPERIENCE = SERVICES_YEARS_EXPERIENCE;

export const ABOUT_HERO_INTRO =
  "Somos una inmobiliaria de raíz porteña, con un equipo que combina experiencia de mercado y trato humano en cada operación.";

export type AboutHistoryTextPart = {
  text: string;
  emphasis?: boolean;
};

export type AboutHistoryParagraph = {
  parts: AboutHistoryTextPart[];
};

export const ABOUT_HISTORY_PARAGRAPHS: AboutHistoryParagraph[] = [
  {
    parts: [
      {
        text: "Desde 1999 Christian Ariel Marani junto a su equipo recorren las calles del barrio porteño de Caballito en la búsqueda constante de nuevas oportunidades.",
      },
    ],
  },
  {
    parts: [
      {
        text: "Sin embargo, fue en 2007, con una visión clara y vocación de crecimiento, cuando decidimos dar un paso fundamental: iniciar nuestro propio proyecto, ",
      },
      { text: "VALORAR INMUEBLES", emphasis: true },
      {
        text: ", concebido con el objetivo de brindar un servicio integral, profesional y orientado a las necesidades de cada cliente.",
      },
    ],
  },
  {
    parts: [
      {
        text: "Nuestra modalidad de trabajo se basa en la cercanía, la confianza y el compromiso con cada cliente. Nuestra propuesta es clara: acompañarlo en la concreción de sus sueños, construyendo vínculos que trascienden lo meramente comercial.",
      },
    ],
  },
  {
    parts: [
      {
        text: "Asimismo, además de contar con sólidos conocimientos en las áreas jurídica y notarial, entendemos que la confianza de nuestros clientes constituye el motor que impulsa nuestra mejora continua y el fortalecimiento permanente de nuestro compromiso profesional.",
      },
    ],
  },
];

export type AboutWorkStyleIconName =
  | "experience"
  | "personal"
  | "integral"
  | "trust";

export const ABOUT_WORK_STYLE: Array<{
  title: string;
  description: string;
  icon: AboutWorkStyleIconName;
}> = [
  {
    title: "Experiencia",
    description: "Más de dos décadas en el mercado inmobiliario.",
    icon: "experience",
  },
  {
    title: "Atención personalizada",
    description:
      "Cada cliente recibe un acompañamiento cercano durante todo el proceso.",
    icon: "personal",
  },
  {
    title: "Asesoramiento integral",
    description:
      "Equipo inmobiliario, jurídico, notarial y contable trabajando en conjunto.",
    icon: "integral",
  },
  {
    title: "Confianza",
    description:
      "Relaciones duraderas basadas en la transparencia y el compromiso.",
    icon: "trust",
  },
];

export const ABOUT_COMMITMENT = {
  title: "Nuestro compromiso",
  description:
    "Cada operación es acompañada desde el primer contacto hasta su cierre. Tu confianza nos impulsa a trabajar con el mayor empeño, construyendo relaciones sinceras que perduran más allá de la firma.",
};

export const ABOUT_DIRECTOR = {
  name: "Christian Ariel Marani",
  roles: ["Martillero, Corredor Público y Tasador."],
  credentials: [
    "Matrícula CPI 3686.",
    "Abogado – IUPFA.",
    "Tomo 154 · Folio 51 · CPACF.",
  ],
  initials: "CM",
  photoSrc: "/valorar-inmuebles-christian-marani.jpeg",
  photoAlt: "Christian Ariel Marani — Valorar Inmuebles",
};

export const ABOUT_CTA = {
  title: "¿Querés que te acompañemos en tu próxima operación inmobiliaria?",
  description:
    "Escribinos y conversemos sobre tu proyecto. Estamos para ayudarte con claridad y respaldo profesional.",
};
