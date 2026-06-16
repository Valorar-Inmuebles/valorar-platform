import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { PageShell } from "@/components/shared/page-shell";
import type { BreadcrumbItem } from "@/components/layout/PageHeader";

type PlaceholderPanelProps = {
  title: string;
  description: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  subNav?: ReactNode;
  children?: ReactNode;
};

export function PlaceholderPanel({
  title,
  description,
  breadcrumbs,
  actions,
  subNav,
  children,
}: PlaceholderPanelProps) {
  return (
    <PageShell
      title={title}
      breadcrumbs={breadcrumbs}
      actions={actions}
      subNav={subNav}
    >
      <Card>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">{description}</p>
          {children}
        </CardContent>
      </Card>
    </PageShell>
  );
}
