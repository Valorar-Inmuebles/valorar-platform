import type { ContactOffice } from "./contact-content";
import { getWhatsAppUrl } from "@/lib/tenant/get-whatsapp-url";

export function getOfficeWhatsAppUrl(office: ContactOffice): string | null {
  return getWhatsAppUrl({
    phone: office.whatsappPhone,
    message: `Hola, me gustaría realizar una consulta — ${office.title}`,
  });
}
