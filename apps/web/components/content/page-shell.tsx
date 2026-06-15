import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/seo/breadcrumbs";
import { SiteContainer } from "@/components/layout/site-container";

type PageShellProps = {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  children?: ReactNode;
};

export function PageShell({
  title,
  description,
  breadcrumbs,
  children,
}: PageShellProps) {
  return (
    <SiteContainer className="py-10 md:py-14">
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      <header className={breadcrumbs ? "mt-6" : undefined}>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-base text-muted">{description}</p>
        ) : null}
      </header>
      {children ? <div className="mt-10">{children}</div> : null}
    </SiteContainer>
  );
}
