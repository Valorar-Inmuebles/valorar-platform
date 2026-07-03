import type { ReactNode } from "react";
import { DevelopmentSubNav } from "@/components/development/development-sub-nav";
import { PageShell } from "@/components/shared/page-shell";
import type { BreadcrumbItem } from "@/components/layout/PageHeader";

type DevelopmentPageShellProps = {
  developmentId: string;
  title?: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  children: ReactNode;
  embedded?: boolean;
};

export function DevelopmentPageShell({
  developmentId,
  title,
  description,
  breadcrumbs,
  actions,
  children,
  embedded = false,
}: DevelopmentPageShellProps) {
  if (embedded) {
    return <>{children}</>;
  }

  return (
    <PageShell
      title={title ?? ""}
      description={description}
      breadcrumbs={breadcrumbs}
      actions={actions}
      subNav={<DevelopmentSubNav developmentId={developmentId} />}
    >
      {children}
    </PageShell>
  );
}
