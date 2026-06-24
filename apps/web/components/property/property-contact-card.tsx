type PropertyContactCardProps = {
  phone: string;
  email: string;
};

export function PropertyContactCard({ phone, email }: PropertyContactCardProps) {
  const phoneHref = phone.replace(/\s/g, "");

  return (
    <div className="rounded-2xl border border-border-default bg-surface-card p-6">
      <h3 className="text-lg font-semibold tracking-tight text-text-primary">
        ¿Tenés dudas?
      </h3>
      <p className="mt-1 text-sm text-text-secondary">
        Nuestro equipo está para asesorarte.
      </p>

      <ul className="mt-4 space-y-3 text-sm">
        {phone ? (
          <li>
            <a
              href={`tel:${phoneHref}`}
              className="inline-flex items-center gap-2 text-text-primary transition hover:text-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
            >
              <PhoneIcon />
              {phone}
            </a>
          </li>
        ) : null}
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

function PhoneIcon() {
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
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
