import type { ReactNode } from "react";

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  icon,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-200 px-6 py-12 text-center ${className}`}
    >
      {icon != null && (
        <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium text-zinc-900">{title}</p>
        {description != null && (
          <p className="text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {action != null && <div>{action}</div>}
    </div>
  );
}
