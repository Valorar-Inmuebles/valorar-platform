import type { ReactNode } from "react";
import Link from "next/link";
import { SiteContainer } from "@/components/layout/site-container";

export type HomeInlineCtaAction = {
  href: string;
  label: string;
  variant: "primary" | "outline";
};

type HomeInlineCtaProps = {
  icon: ReactNode;
  title: string;
  description: string;
  actions: HomeInlineCtaAction[];
};

const ACTION_CLASS: Record<HomeInlineCtaAction["variant"], string> = {
  outline:
    "inline-flex h-11 w-full items-center justify-center rounded-xl border border-brand-green bg-transparent px-5 text-sm font-semibold text-brand-green transition hover:bg-brand-green/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green sm:w-auto",
  primary:
    "inline-flex h-11 w-full items-center justify-center rounded-xl border border-brand-green bg-brand-green px-5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green sm:w-auto",
};

export function HomeInlineCta({
  icon,
  title,
  description,
  actions,
}: HomeInlineCtaProps) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border-default bg-surface-card px-5 py-5 shadow-sm md:flex-row md:items-center md:gap-6 md:px-7 md:py-6 lg:gap-8 lg:px-8">
      <div className="flex shrink-0 items-start md:items-center">{icon}</div>

      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold tracking-tight text-text-primary md:text-xl">
          {title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-text-secondary md:mt-1">
          {description}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:shrink-0 md:items-center">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={ACTION_CLASS[action.variant]}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

type HomeCtaBandProps = {
  children: ReactNode;
  className?: string;
};

export function HomeCtaBand({ children, className = "" }: HomeCtaBandProps) {
  return (
    <section className={`bg-surface-base py-8 md:py-10 ${className}`}>
      <SiteContainer>{children}</SiteContainer>
    </section>
  );
}

export function HomeInlineCtaIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-green/10 text-brand-green md:h-12 md:w-12">
      {children}
    </div>
  );
}
