import { SERVICES_YEARS_EXPERIENCE } from "@/lib/services/services-content";

export const CONTACT_HERO = {
  eyebrow: "Contacto",
  title: "Contacto",
  subtitle:
    "Estamos para ayudarte a encontrar la mejor solución inmobiliaria.",
  intro:
    "Envianos tu consulta y un asesor de Valorar Inmuebles se comunicará con vos a la brevedad.",
};

export type ContactOffice = {
  id: string;
  title: string;
  address: string;
  phones: string[];
  whatsappPhone: string;
  whatsappDisplay: string;
  latitude: number;
  longitude: number;
};

export const CONTACT_OFFICES: ContactOffice[] = [
  {
    id: "casa-central",
    title: "Casa Central",
    address: "Cnel. Ramón L. Falcón 1695, CP 1424\nCapital Federal",
    phones: ["4926-0880", "4902-8557"],
    whatsappPhone: "5491144736714",
    whatsappDisplay: "114-473-6714",
    latitude: -34.6206,
    longitude: -58.4418,
  },
  {
    id: "sucursal-flores",
    title: "Sucursal Flores",
    address: "Av. Directorio 2093, CP 1406\nCapital Federal",
    phones: ["6060-5107"],
    whatsappPhone: "5491124591701",
    whatsappDisplay: "112-459-1701",
    latitude: -34.6348,
    longitude: -58.4629,
  },
];

export const CONTACT_EMAIL = "info@valorarinmuebles.com.ar";

export const CONTACT_HOURS = {
  weekdays: "Lun. a Vie. de 10 a 19 hs.",
  saturday: "Sáb. de 10 a 13 hs.",
};

export const CONTACT_MAP = {
  title: "Nuestras sucursales",
  description: "Encontrá Casa Central y Sucursal Flores en el mapa.",
};

export const CONTACT_BENEFITS = [
  {
    title: "Atención personalizada",
    description:
      "Cada consulta recibe seguimiento dedicado según tu necesidad.",
  },
  {
    title: `Más de ${SERVICES_YEARS_EXPERIENCE} años de experiencia`,
    description:
      "Trayectoria en el mercado inmobiliario porteño con foco en resultados.",
  },
  {
    title: "Acompañamiento integral",
    description:
      "Inmobiliario, jurídico y contable trabajando de forma coordinada.",
  },
  {
    title: "Equipo profesional",
    description:
      "Asesores y especialistas listos para orientarte en cada etapa.",
  },
];

export const CONTACT_CTA = {
  title: "¿Necesitás ayuda para encontrar tu próxima propiedad?",
  description:
    "Completá el formulario y conversemos sobre la mejor opción para vos.",
  targetId: "contacto-form",
};

export const CONTACT_FORM_TOAST_MESSAGE =
  "Próximamente este formulario estará disponible.";
