import type { ReactNode } from "react";
import { PropertySubNav } from "@/components/property/property-sub-nav";
import { PageShell } from "@/components/shared/page-shell";
import type { BreadcrumbItem } from "@/components/layout/PageHeader";

type PropertyPageShellProps = {
  propertyId: string;
  title?: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  children: ReactNode;
  /** When true, layout provides header/sub-nav; page renders content only. */
  embedded?: boolean;
};

export function PropertyPageShell({
  propertyId,
  title,
  description,
  breadcrumbs,
  actions,
  children,
  embedded = false,
}: PropertyPageShellProps) {
  if (embedded) {
    return <>{children}</>;
  }

  return (
    <PageShell
      title={title ?? ""}
      description={description}
      breadcrumbs={breadcrumbs}
      actions={actions}
      subNav={<PropertySubNav propertyId={propertyId} />}
    >
      {children}
    </PageShell>
  );
}
