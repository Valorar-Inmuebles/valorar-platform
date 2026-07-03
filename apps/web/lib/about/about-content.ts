import { SERVICES_YEARS_EXPERIENCE } from "@/lib/services/services-content";

export const ABOUT_YEARS_EXPERIENCE = SERVICES_YEARS_EXPERIENCE;

export const ABOUT_HERO_INTRO =
  "Somos una inmobiliaria de raíz porteña, con un equipo que combina experiencia de mercado y trato humano en cada operación.";

export const ABOUT_HISTORY_PARAGRAPHS = [
  "Comenzamos en Caballito en 1999, siendo testigos del crecimiento de nuestro barrio y de la evolución del mercado inmobiliario en la zona.",
  "Desde entonces, Christian A. Marani y su equipo recorren sus calles, visitan hogares y conocen los deseos de quienes confían en nosotros para cumplirlos.",
  "Construimos un trato directo, cercano y de mutua confianza con nuestros clientes — algo que nos diferencia y nos gratifica. Dimos la bienvenida a muchos vecinos que hoy siguen eligiéndonos, y mantenemos vínculos estrechos con quienes se mudaron fuera del barrio.",
  "Nuestro trabajo es claro y preciso; con el mismo entusiasmo del primer día seguimos creciendo. En 2007 dimos un paso decisivo con la fundación de Valorar Inmuebles, el nombre que hoy nos identifica.",
  "Contamos con profesionales destacados en contabilidad, área jurídica y notarial para responder cada consulta con el respaldo que merecés.",
] as const;

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
  name: "Christian Marani",
  roles: [
    "Martillero Público Nacional",
    "Corredor Inmobiliario",
    "Tasador",
  ],
  credentials: [
    "Corredor Inmobiliario MN° 3686 CUCICBA",
    "Abogado UPFA",
    "Tomo 154 Folio 51 CPACF",
  ],
  initials: "CM",
};

export const ABOUT_CTA = {
  title: "¿Querés que te acompañemos en tu próxima operación inmobiliaria?",
  description:
    "Escribinos y conversemos sobre tu proyecto. Estamos para ayudarte con claridad y respaldo profesional.",
};
