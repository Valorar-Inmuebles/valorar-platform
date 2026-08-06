import Image from "next/image";
import { SiteContainer } from "@/components/layout/site-container";
import { ABOUT_DIRECTOR } from "@/lib/about/about-content";

type AboutDirectorSectionProps = {
  photoSrc?: string | null;
  photoAlt?: string;
};

export function AboutDirectorSection({
  photoSrc = ABOUT_DIRECTOR.photoSrc,
  photoAlt = ABOUT_DIRECTOR.photoAlt,
}: AboutDirectorSectionProps) {
  const [profession, ...credentialLines] = [
    ...ABOUT_DIRECTOR.roles,
    ...ABOUT_DIRECTOR.credentials,
  ];

  return (
    <section className="border-t border-border-default bg-surface-alt py-16 md:py-20">
      <SiteContainer>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-orange">
          Dirección
        </p>

        <div className="mt-8 flex flex-col gap-8 md:mt-10 md:flex-row md:items-start md:gap-12 lg:gap-16">
          <div className="shrink-0">
            {photoSrc ? (
              <div className="relative h-56 w-56 overflow-hidden rounded-2xl md:h-64 md:w-64 lg:h-72 lg:w-72">
                <Image
                  src={photoSrc}
                  alt={photoAlt}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 224px, (max-width: 1024px) 256px, 288px"
                />
              </div>
            ) : (
              <div
                className="flex h-56 w-56 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-green/10 to-brand-green/5 md:h-64 md:w-64 lg:h-72 lg:w-72"
                aria-hidden
              >
                <span className="text-4xl font-semibold tracking-tight text-brand-green md:text-5xl">
                  {ABOUT_DIRECTOR.initials}
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 md:pt-3">
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
              {ABOUT_DIRECTOR.name}
            </h2>

            {profession ? (
              <p className="mt-3 text-base font-medium text-text-secondary md:text-lg">
                {profession}
              </p>
            ) : null}

            <div className="mt-6 space-y-2 border-t border-border-default/80 pt-6">
              {credentialLines.map((line) => (
                <p
                  key={line}
                  className="text-sm leading-relaxed text-text-secondary md:text-[0.9375rem]"
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
