import { Phone } from "lucide-react";
import { LocationIcon, WhatsappIcon } from "@/components/icons";
import {
  CONTACT_EMAIL,
  CONTACT_HOURS,
  CONTACT_OFFICES,
} from "@/lib/contact/contact-content";
import { getWhatsAppUrl } from "@/lib/tenant/get-whatsapp-url";

function formatPhoneHref(phone: string): string {
  return `tel:+5411${phone.replace(/\D/g, "")}`;
}

function formatPhoneDisplay(phone: string): string {
  return `+54 11 ${phone}`;
}

const ROW_CLASS = "flex items-start gap-2";
const ICON_CLASS = "mt-0.5 shrink-0 text-brand-green";
const LINK_CLASS = "transition-colors hover:text-brand-green";

type ContactInfoCardsProps = {
  whatsappFallbackPhone?: string;
};

export function ContactInfoCards({
  whatsappFallbackPhone = "",
}: ContactInfoCardsProps) {
  return (
    <div className="space-y-5">
      {CONTACT_OFFICES.map((office) => {
        const whatsappUrl =
          getWhatsAppUrl({
            phone: office.whatsappPhone,
            message: `Hola, me gustaría realizar una consulta — ${office.title}`,
          }) ??
          (whatsappFallbackPhone
            ? getWhatsAppUrl({
                phone: whatsappFallbackPhone,
                message: `Hola, me gustaría realizar una consulta — ${office.title}`,
              })
            : null);

        return (
          <article
            key={office.id}
            className="rounded-2xl border border-border-default bg-surface-card p-6 transition-colors duration-300 hover:border-brand-green/40 md:p-7"
          >
            <h3 className="text-lg font-semibold tracking-tight text-text-primary">
              {office.title}
            </h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-text-secondary">
              <div className={ROW_CLASS}>
                <LocationIcon size={18} className={ICON_CLASS} />
                <span className="whitespace-pre-line">{office.address}</span>
              </div>

              {office.phones.map((phone) => (
                <div key={phone} className={ROW_CLASS}>
                  <Phone
                    size={18}
                    strokeWidth={1.75}
                    className={ICON_CLASS}
                    aria-hidden
                  />
                  <a href={formatPhoneHref(phone)} className={LINK_CLASS}>
                    {formatPhoneDisplay(phone)}
                  </a>
                </div>
              ))}

              {whatsappUrl ? (
                <div className={ROW_CLASS}>
                  <WhatsappIcon size={18} className={ICON_CLASS} />
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${LINK_CLASS} font-medium text-brand-green`}
                  >
                    WhatsApp {office.whatsappDisplay}
                  </a>
                </div>
              ) : null}
            </div>
          </article>
        );
      })}

      <article className="rounded-2xl border border-border-default bg-surface-card p-6 transition-colors duration-300 hover:border-brand-green/40 md:p-7">
        <h3 className="text-lg font-semibold tracking-tight text-text-primary">
          Email
        </h3>
        <p className="mt-4">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-sm text-text-secondary transition-colors hover:text-brand-green"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </article>

      <article className="rounded-2xl border border-border-default bg-surface-card p-6 transition-colors duration-300 hover:border-brand-green/40 md:p-7">
        <h3 className="text-lg font-semibold tracking-tight text-text-primary">
          Horarios
        </h3>
        <ul className="mt-4 space-y-2 text-sm text-text-secondary">
          <li>{CONTACT_HOURS.weekdays}</li>
          <li>{CONTACT_HOURS.saturday}</li>
        </ul>
      </article>
    </div>
  );
}
