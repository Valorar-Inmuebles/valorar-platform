import Image from "next/image";
import Link from "next/link";

export type EditorialIllustrationAction = {
  href: string;
  label: string;
};

export type EditorialIllustrationAsset = {
  src: string;
  alt: string;
};

type EditorialIllustrationBannerProps = {
  title: string;
  description: string;
  illustration: EditorialIllustrationAsset;
  primaryAction: EditorialIllustrationAction;
  secondaryAction?: EditorialIllustrationAction;
};

const PRIMARY_ACTION_CLASS =
  "inline-flex h-11 items-center justify-center rounded-xl border border-brand-green bg-brand-green px-5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green";

const SECONDARY_ACTION_CLASS =
  "inline-flex h-11 items-center justify-center rounded-xl border border-brand-green bg-transparent px-5 text-sm font-semibold text-brand-green transition hover:bg-brand-green/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green";

export function EditorialIllustrationBanner({
  title,
  description,
  illustration,
  primaryAction,
  secondaryAction,
}: EditorialIllustrationBannerProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-default bg-[#f3f7f4] shadow-sm">
      <div className="flex min-h-[200px] flex-col md:min-h-[220px] md:flex-row lg:min-h-[240px]">
        <div className="flex flex-1 flex-col justify-center gap-6 px-6 py-8 md:max-w-[55%] md:px-10 md:py-10">
          <div className="flex gap-4">
            <span
              className="mt-1 w-0.5 shrink-0 self-stretch rounded-full bg-brand-green"
              aria-hidden
            />
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-brand-green md:text-2xl md:leading-snug">
                {title}
              </h2>
              <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-text-secondary md:text-[0.9375rem]">
                {description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pl-5">
            <Link href={primaryAction.href} className={PRIMARY_ACTION_CLASS}>
              {primaryAction.label}
            </Link>
            {secondaryAction ? (
              <Link
                href={secondaryAction.href}
                className={SECONDARY_ACTION_CLASS}
              >
                {secondaryAction.label}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="relative flex w-full items-end justify-center px-6 pb-6 pt-2 md:w-[45%] md:justify-end md:px-8 md:pb-8 md:pt-6">
          <Image
            src={illustration.src}
            alt={illustration.alt}
            width={703}
            height={356}
            className="h-auto w-full max-w-[28rem] object-contain object-bottom md:max-w-none"
            priority={false}
          />
        </div>
      </div>
    </div>
  );
}
