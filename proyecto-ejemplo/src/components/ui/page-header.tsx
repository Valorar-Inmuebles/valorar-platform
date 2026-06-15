import { ReactNode } from "react";
import { Breadcrumb, BreadcrumbItem } from "./breadcrumb";
import { BackButton } from "@/components/ui/back-button";

type Props = {
  title?: string;
  titleAddon?: ReactNode;
  breadcrumb?: BreadcrumbItem[];
  actions?: ReactNode;
  back?: boolean;
  backHref?: string;
};

export function PageHeader({
  title,
  titleAddon,
  breadcrumb,
  actions,
  back = false,
}: Props) {
  const hasTitle = Boolean(title?.trim());
  const showTitleRow = hasTitle || titleAddon || actions;

  return (
    <div className="w-full space-y-1.5">
      {(breadcrumb || back) && (
        <div className="flex items-center gap-1.5">
          {back && <BackButton />}

          {breadcrumb && <Breadcrumb items={breadcrumb} />}
        </div>
      )}

      {showTitleRow && (
        <div className="flex w-full items-center justify-between gap-3">
          {(hasTitle || titleAddon) && (
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {hasTitle && (
                  <h1 className="truncate text-xl font-semibold text-gray-900">
                    {title}
                  </h1>
                )}
                {titleAddon}
              </div>
            </div>
          )}

          {actions && (
            <div className="flex shrink-0 items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}