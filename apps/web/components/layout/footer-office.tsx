import { Mail, Phone } from "lucide-react";
import { LocationIcon, WhatsappIcon } from "@/components/icons";
import type { ContactOffice } from "@/lib/contact/contact-content";
import { CONTACT_EMAIL } from "@/lib/contact/contact-content";
import { getWhatsAppUrl } from "@/lib/tenant/get-whatsapp-url";

function formatPhoneHref(phone: string): string {
  return `tel:+5411${phone.replace(/\D/g, "")}`;
}

const ICON_CLASS = "mt-0.5 size-[18px] shrink-0 text-brand-green";
const ROW_CLASS = "flex items-start gap-2.5";
const LINK_CLASS =
  "transition-colors hover:text-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green";

type FooterOfficeProps = {
  office: ContactOffice;
};

export function FooterOffice({ office }: FooterOfficeProps) {
  const whatsappUrl = getWhatsAppUrl({
    phone: office.whatsappPhone,
    message: `Hola, me gustaría realizar una consulta — ${office.title}`,
  });

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-primary">
        {office.title}
      </h2>
      <ul className="mt-4 space-y-3 text-sm text-text-secondary">
        <li className={ROW_CLASS}>
          <LocationIcon size={18} className={ICON_CLASS} />
          <span className="whitespace-pre-line">{office.address}</span>
        </li>
        <li className={ROW_CLASS}>
          <Phone size={18} strokeWidth={1.75} className={ICON_CLASS} aria-hidden />
          <span>
            {office.phones.map((phone, index) => (
              <span key={phone}>
                {index > 0 ? " / " : null}
                <a href={formatPhoneHref(phone)} className={LINK_CLASS}>
                  {phone}
                </a>
              </span>
            ))}
          </span>
        </li>
        <li className={ROW_CLASS}>
          <WhatsappIcon size={18} className={ICON_CLASS} />
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
            >
              {office.whatsappDisplay}
            </a>
          ) : (
            <span>{office.whatsappDisplay}</span>
          )}
        </li>
        <li className={ROW_CLASS}>
          <Mail size={18} strokeWidth={1.75} className={ICON_CLASS} aria-hidden />
          <a href={`mailto:${CONTACT_EMAIL}`} className={LINK_CLASS}>
            {CONTACT_EMAIL}
          </a>
        </li>
      </ul>
    </div>
  );
}
