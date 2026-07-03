export const CONTACT_INQUIRY_OPTIONS = [
  { value: "compra", label: "Compra" },
  { value: "venta", label: "Venta" },
  { value: "alquiler", label: "Alquiler" },
  { value: "emprendimientos", label: "Emprendimientos" },
  { value: "tasaciones", label: "Tasaciones" },
  { value: "asesoramiento-juridico", label: "Asesoramiento Jurídico" },
  { value: "otro", label: "Otro" },
] as const;

export type ContactInquiryReason =
  (typeof CONTACT_INQUIRY_OPTIONS)[number]["value"];

/**
 * Payload shape prepared for future Lead API / Resend integration.
 */
export type ContactFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  inquiryReason: ContactInquiryReason | "";
  message: string;
  consent: boolean;
};

export const EMPTY_CONTACT_FORM_VALUES: ContactFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  inquiryReason: "",
  message: "",
  consent: false,
};

/**
 * Future integration point — replace toast with API call.
 */
export async function submitContactForm(
  _values: ContactFormValues,
): Promise<void> {
  // Reserved for Lead API / Resend.
}
