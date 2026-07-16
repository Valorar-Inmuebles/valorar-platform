import Image from "next/image";
import Link from "next/link";

export type EditorialCtaAction = {
  href: string;
  label: string;
};

export type EditorialCtaIllustration = {
  src: string;
  alt: string;
};

type EditorialCtaBannerProps = {
  title: string;
  description: string;
  illustration: EditorialCtaIllustration;
  primaryAction: EditorialCtaAction;
  secondaryAction?: EditorialCtaAction;
  /** Side of the banner where the VIS illustration sits. */
  illustrationAlign?: "left" | "right";
};

const PRIMARY_ACTION_CLASS =
  "inline-flex h-11 w-full items-center justify-center rounded-xl border border-brand-green bg-brand-green px-5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green sm:w-auto";

const SECONDARY_ACTION_CLASS =
  "inline-flex h-11 w-full items-center justify-center rounded-xl border border-brand-green bg-transparent px-5 text-sm font-semibold text-brand-green transition hover:bg-brand-green/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green sm:w-auto";

export function EditorialCtaBanner({
  title,
  description,
  illustration,
  primaryAction,
  secondaryAction,
  illustrationAlign = "left",
}: EditorialCtaBannerProps) {
  const illustrationBlock = (
    <div className="shrink-0">
      <Image
        src={illustration.src}
        alt={illustration.alt}
        width={703}
        height={356}
        className="h-auto w-[150px] object-contain"
      />
    </div>
  );

  const textBlock = (
    <div className="min-w-0 flex-1 text-left">
      <h2 className="text-xl font-semibold tracking-tight text-brand-green md:text-[1.375rem] md:leading-snug">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary md:mt-2.5 md:text-[0.9375rem] md:leading-relaxed">
        {description}
      </p>
    </div>
  );

  const actionsBlock = (
    <div className="flex w-full flex-row items-center gap-3 md:mr-6 md:w-auto md:shrink-0">
      {secondaryAction ? (
        <Link href={secondaryAction.href} className={SECONDARY_ACTION_CLASS}>
          {secondaryAction.label}
        </Link>
      ) : null}
      <Link href={primaryAction.href} className={PRIMARY_ACTION_CLASS}>
        {primaryAction.label}
      </Link>
    </div>
  );

  return (
    <div className="flex flex-col items-start gap-6 rounded-2xl border border-border-default bg-surface-card px-6 py-8 shadow-sm md:flex-row md:items-center md:gap-8 md:px-10 md:py-10 lg:gap-10">
      {illustrationAlign === "left" ? (
        <>
          {illustrationBlock}
          {textBlock}
          {actionsBlock}
        </>
      ) : (
        <>
          {textBlock}
          {actionsBlock}
          {illustrationBlock}
        </>
      )}
    </div>
  );
}
