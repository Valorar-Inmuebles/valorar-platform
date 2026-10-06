import { WhatsappIcon } from "@/components/icons";
import { CONTACT_OFFICES } from "@/lib/contact/contact-content";
import { getOfficeWhatsAppUrl } from "@/lib/contact/office-whatsapp";

type PropertyContactCardProps = {
  email: string;
};

export function PropertyContactCard({ email }: PropertyContactCardProps) {
  return (
    <div className="rounded-2xl border border-border-default bg-surface-card p-6">
      <h3 className="text-lg font-semibold tracking-tight text-text-primary">
        ¿Tenés dudas?
      </h3>
      <p className="mt-1 text-sm text-text-secondary">
        Nuestro equipo está para asesorarte.
      </p>

      <ul className="mt-4 space-y-3 text-sm">
        {CONTACT_OFFICES.map((office) => {
          const whatsappUrl = getOfficeWhatsAppUrl(office);

          return (
            <li key={office.id}>
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-text-primary transition hover:text-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
                >
                  <WhatsappIcon
                    size={18}
                    className="shrink-0 text-brand-green"
                  />
                  {office.whatsappDisplay}
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 text-text-primary">
                  <WhatsappIcon
                    size={18}
                    className="shrink-0 text-brand-green"
                  />
                  {office.whatsappDisplay}
                </span>
              )}
            </li>
          );
        })}
        {email ? (
          <li>
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 text-text-primary transition hover:text-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
            >
              <MailIcon />
              {email}
            </a>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function MailIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-brand-green"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m22 6-10 7L2 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
