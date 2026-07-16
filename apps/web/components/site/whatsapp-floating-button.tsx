import { WhatsappLogoIcon } from "@/components/icons";
import { getFloatingWhatsAppUrl } from "@/lib/tenant/get-whatsapp-url";

/**
 * Site-wide floating WhatsApp CTA.
 *
 * Configure the destination with `NEXT_PUBLIC_WHATSAPP_URL`
 * (e.g. `https://wa.me/5491112345678`). Falls back to `https://wa.me/`.
 */
export function WhatsAppFloatingButton() {
  const href = getFloatingWhatsAppUrl();

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      title="Contactar por WhatsApp"
      className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/15 transition duration-200 hover:scale-105 hover:bg-[#20BD5A] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] max-sm:right-4 max-sm:bottom-[max(1rem,env(safe-area-inset-bottom))] sm:right-6 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <WhatsappLogoIcon size={28} />
    </a>
  );
}
