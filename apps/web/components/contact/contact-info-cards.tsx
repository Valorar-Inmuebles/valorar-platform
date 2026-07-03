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

            <div className="mt-4 space-y-3 text-sm text-text-secondary">
              <p className="inline-flex items-start gap-2">
                <LocationIcon
                  size={18}
                  className="mt-0.5 shrink-0 text-brand-green"
                />
                <span>{office.address}</span>
              </p>

              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-text-primary">
                  Teléfono
                </p>
                {office.phones.map((phone) => (
                  <p key={phone}>
                    <a
                      href={formatPhoneHref(phone)}
                      className="transition-colors hover:text-brand-green"
                    >
                      {formatPhoneDisplay(phone)}
                    </a>
                  </p>
                ))}
              </div>

              {whatsappUrl ? (
                <p>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-medium text-brand-green transition hover:underline"
                  >
                    <WhatsappIcon size={18} />
                    WhatsApp
                  </a>
                </p>
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
