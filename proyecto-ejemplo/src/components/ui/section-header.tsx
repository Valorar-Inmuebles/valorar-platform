import type { ReactNode } from "react";

export type SectionHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <h1 className="text-base font-medium tracking-tight text-zinc-900">
          {title}
        </h1>
        {description != null && (
          <p className="text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {action != null && <div className="shrink-0">{action}</div>}
    </div>
  );
}
