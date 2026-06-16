import type { ReactNode } from "react";
import {
  PageHeader,
  type BreadcrumbItem,
} from "@/components/layout/PageHeader";

export type PageShellProps = {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  subNav?: ReactNode;
  children: ReactNode;
};

/**
 * Patrón único de página del admin: header + zona opcional (sub-nav) + contenido.
 */
export function PageShell({
  title,
  description,
  breadcrumbs,
  actions,
  subNav,
  children,
}: PageShellProps) {
  return (
    <div className="flex flex-col">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
      >
        {actions}
      </PageHeader>

      {subNav ? <div className="mb-6">{subNav}</div> : null}

      {children}
    </div>
  );
}
