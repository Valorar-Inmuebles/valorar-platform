import Image from "next/image";
import { Gavel, Scale, type LucideIcon } from "lucide-react";
import { SiteContainer } from "@/components/layout/site-container";
import { ABOUT_DIRECTOR } from "@/lib/about/about-content";

type AboutDirectorSectionProps = {
  photoSrc?: string | null;
  photoAlt?: string;
};

type ProfessionAccent = "orange" | "green";

const PROFESSION_ICONS: Record<ProfessionAccent, LucideIcon> = {
  orange: Gavel,
  green: Scale,
};

function NameSeparator() {
  return (
    <div
      className="mt-5 flex items-center justify-center gap-2.5 sm:gap-3"
      aria-hidden="true"
    >
      <span className="h-px w-10 bg-brand-orange/50 sm:w-14" />
      <span className="size-1.5 rotate-45 rounded-[1px] bg-brand-orange" />
      <span className="h-px w-10 bg-brand-orange/50 sm:w-14" />
    </div>
  );
}

function ProfessionIconRow({
  icon: Icon,
  accent,
}: {
  icon: LucideIcon;
  accent: ProfessionAccent;
}) {
  const accentClass =
    accent === "orange" ? "text-brand-orange" : "text-brand-green";
  const lineClass =
    accent === "orange" ? "bg-brand-orange/40" : "bg-brand-green/35";

  return (
    <div className="flex items-center justify-center gap-2.5 sm:gap-3">
      <span className={`h-px w-6 sm:w-10 md:w-12 ${lineClass}`} />
      <Icon
        className={`size-[1.375rem] shrink-0 sm:size-6 md:size-[1.625rem] ${accentClass}`}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <span className={`h-px w-6 sm:w-10 md:w-12 ${lineClass}`} />
    </div>
  );
}

function DirectorProfessionBlock({
  title,
  lines,
  accent,
  icon,
}: {
  title: string;
  accent: ProfessionAccent;
  icon: LucideIcon;
  lines: string[];
}) {
  const titleClass =
    accent === "orange"
      ? "text-brand-orange"
      : "text-brand-green";

  return (
    <article className="text-center">
      <ProfessionIconRow icon={icon} accent={accent} />

      <h3
        className={`mt-4 max-w-prose text-base font-semibold uppercase leading-snug tracking-[0.08em] sm:text-[1.0625rem] md:text-lg md:leading-snug lg:text-xl ${titleClass} mx-auto`}
      >
        {title}
      </h3>

      <ul className="mt-5 space-y-2">
        {lines.map((line) => (
          <li
            key={line}
            className="text-[0.9375rem] leading-[1.7] text-text-secondary sm:text-base md:text-[1.0625rem]"
          >
            {line}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function AboutDirectorSection({
  photoSrc = ABOUT_DIRECTOR.photoSrc,
  photoAlt = ABOUT_DIRECTOR.photoAlt,
}: AboutDirectorSectionProps) {
  const [realEstateProfession, legalProfession] = ABOUT_DIRECTOR.professions;

  return (
    <section className="border-t border-border-default bg-surface-alt py-16 md:py-20">
      <SiteContainer>
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-orange sm:text-[0.8125rem]">
            Dirección
          </p>

          <h2 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-tight text-text-primary sm:text-[2rem] md:mt-4 md:text-[2.25rem] lg:text-[2.5rem]">
            {ABOUT_DIRECTOR.name}
          </h2>

          <NameSeparator />
        </header>

        <div className="mt-10 grid items-start gap-10 md:mt-12 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-center md:gap-12 lg:gap-16">
            <div className="mx-auto w-full max-w-xs md:mx-0 md:max-w-none">
              {photoSrc ? (
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
                  <Image
                    src={photoSrc}
                    alt={photoAlt}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 320px, 40vw"
                  />
                </div>
              ) : (
                <div
                  className="flex aspect-square w-full items-center justify-center rounded-2xl bg-gradient-to-br from-brand-green/10 to-brand-green/5"
                  aria-hidden
                >
                  <span className="text-5xl font-semibold tracking-tight text-brand-green md:text-6xl">
                    {ABOUT_DIRECTOR.initials}
                  </span>
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col justify-center gap-8 py-1 md:gap-10 md:py-0">
              {realEstateProfession ? (
                <DirectorProfessionBlock
                  title={realEstateProfession.title}
                  lines={realEstateProfession.lines}
                  accent="orange"
                  icon={PROFESSION_ICONS.orange}
                />
              ) : null}

              {realEstateProfession && legalProfession ? (
                <div
                  className="h-px bg-border-default/70"
                  aria-hidden="true"
                />
              ) : null}

              {legalProfession ? (
                <DirectorProfessionBlock
                  title={legalProfession.title}
                  lines={legalProfession.lines}
                  accent="green"
                  icon={PROFESSION_ICONS.green}
                />
              ) : null}
            </div>
          </div>
      </SiteContainer>
    </section>
  );
}
