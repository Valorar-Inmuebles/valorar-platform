import Image from "next/image";
import Link from "next/link";

export type CompactCtaAction = {
  href: string;
  label: string;
  variant?: "primary" | "outline";
};

export type CompactCtaIllustration = {
  src: string;
  alt: string;
};

type CompactCtaBannerProps = {
  title: string;
  description: string;
  illustration: CompactCtaIllustration;
  primaryAction: CompactCtaAction;
  secondaryAction?: CompactCtaAction;
  /** Vertical card composition (e.g. filters sidebar). */
  layout?: "inline" | "stack";
};

const PRIMARY_ACTION_CLASS =
  "inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-brand-green bg-brand-green px-4 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green";

const OUTLINE_ACTION_CLASS =
  "inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-brand-green bg-transparent px-4 text-sm font-semibold text-brand-green transition hover:bg-brand-green hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green";

function actionClassName(
  action: CompactCtaAction,
  role: "primary" | "secondary",
  fullWidth = false,
): string {
  const variant =
    action.variant ?? (role === "secondary" ? "outline" : "primary");
  const base =
    variant === "outline" ? OUTLINE_ACTION_CLASS : PRIMARY_ACTION_CLASS;
  return fullWidth ? `${base} w-full` : base;
}

export function CompactCtaBanner({
  title,
  description,
  illustration,
  primaryAction,
  secondaryAction,
  layout = "inline",
}: CompactCtaBannerProps) {
  const isStack = layout === "stack";

  return (
    <div
      className={
        isStack
          ? "flex flex-col items-center gap-5 rounded-2xl border border-border-default bg-surface-card px-5 py-6 text-center shadow-sm md:px-6 md:py-7"
          : "flex flex-col items-stretch gap-5 rounded-2xl border border-border-default bg-surface-card px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:gap-7 sm:px-6 sm:py-5 md:gap-8 md:px-8 md:py-6"
      }
    >
      <div
        className={
          isStack
            ? "flex shrink-0 items-center justify-center"
            : "flex shrink-0 items-center justify-center self-center sm:self-center"
        }
      >
        <Image
          src={illustration.src}
          alt={illustration.alt}
          width={703}
          height={356}
          className={
            isStack
              ? "h-auto w-[156px] object-contain"
              : "h-auto w-[200px] object-contain sm:w-[144px] md:w-[156px]"
          }
        />
      </div>

      <div
        className={
          isStack
            ? "min-w-0"
            : "min-w-0 flex-1 text-center sm:pr-2 sm:text-left"
        }
      >
        <h2 className="text-base font-semibold leading-snug tracking-tight text-brand-green md:text-lg">
          {title}
        </h2>
        <p
          className={
            isStack
              ? "mx-auto mt-1 max-w-xl text-sm leading-snug text-text-secondary"
              : "mx-auto mt-1 max-w-xl text-sm leading-snug text-text-secondary sm:mx-0"
          }
        >
          {description}
        </p>
      </div>

      <div
        className={
          isStack
            ? "flex w-full shrink-0 flex-col items-stretch gap-2.5"
            : "flex shrink-0 flex-row flex-wrap items-center justify-center gap-2.5 sm:justify-end"
        }
      >
        {secondaryAction ? (
          <Link
            href={secondaryAction.href}
            className={actionClassName(secondaryAction, "secondary", isStack)}
          >
            {secondaryAction.label}
          </Link>
        ) : null}
        <Link
          href={primaryAction.href}
          className={actionClassName(primaryAction, "primary", isStack)}
        >
          {primaryAction.label}
        </Link>
      </div>
    </div>
  );
}
