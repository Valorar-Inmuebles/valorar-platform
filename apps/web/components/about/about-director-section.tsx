import Image from "next/image";
import { SiteContainer } from "@/components/layout/site-container";
import { ABOUT_DIRECTOR } from "@/lib/about/about-content";

type AboutDirectorSectionProps = {
  photoSrc?: string | null;
  photoAlt?: string;
};

export function AboutDirectorSection({
  photoSrc = null,
  photoAlt,
}: AboutDirectorSectionProps) {
  const alt = photoAlt ?? ABOUT_DIRECTOR.name;

  return (
    <section className="border-t border-border-default bg-surface-alt py-16 md:py-20">
      <SiteContainer>
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-orange">
            Dirección
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            Nuestro director
          </h2>

          <div className="mt-10 flex flex-col gap-8 rounded-2xl border border-border-default bg-surface-card p-6 md:flex-row md:items-start md:gap-10 md:p-8">
            <div className="mx-auto shrink-0 md:mx-0">
              {photoSrc ? (
                <div className="relative h-40 w-40 overflow-hidden rounded-2xl ring-1 ring-border-default md:h-48 md:w-48">
                  <Image
                    src={photoSrc}
                    alt={alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 160px, 192px"
                  />
                </div>
              ) : (
                <div
                  className="flex h-40 w-40 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-green/10 to-brand-green/5 ring-1 ring-border-default md:h-48 md:w-48"
                  aria-hidden
                >
                  <span className="text-3xl font-semibold tracking-tight text-brand-green md:text-4xl">
                    {ABOUT_DIRECTOR.initials}
                  </span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 text-center md:text-left">
              <h3 className="text-xl font-semibold tracking-tight text-text-primary md:text-2xl">
                {ABOUT_DIRECTOR.name}
              </h3>

              <ul className="mt-4 space-y-1">
                {ABOUT_DIRECTOR.roles.map((role) => (
                  <li
                    key={role}
                    className="text-sm font-medium text-text-secondary"
                  >
                    {role}
                  </li>
                ))}
              </ul>

              <ul className="mt-6 space-y-2 border-t border-border-default pt-6">
                {ABOUT_DIRECTOR.credentials.map((credential) => (
                  <li
                    key={credential}
                    className="text-sm leading-relaxed text-text-secondary"
                  >
                    {credential}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
