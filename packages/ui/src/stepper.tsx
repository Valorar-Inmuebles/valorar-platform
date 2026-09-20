"use client";

import { cn } from "./lib/cn";

export type StepStatus = "completed" | "current" | "pending";

export type StepperItem = {
  id: string;
  label: string;
  description?: string;
  status: StepStatus;
  disabled?: boolean;
};

export type StepperProps = {
  items: StepperItem[];
  onStepChange?: (id: string) => void;
  ariaLabel?: string;
  className?: string;
};

export function Stepper({
  items,
  onStepChange,
  ariaLabel = "Progreso",
  className,
}: StepperProps) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-0">
        {items.map((item, index) => {
          const interactive = !!onStepChange && !item.disabled;
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                  item.status === "completed" &&
                    "border-primary bg-primary text-primary-foreground",
                  item.status === "current" &&
                    "border-primary bg-surface text-primary ring-2 ring-primary/15",
                  item.status === "pending" &&
                    "border-border bg-surface text-muted",
                )}
              >
                {item.status === "completed" ? "✓" : index + 1}
              </span>
              <span className="min-w-0 text-left">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    item.status === "current"
                      ? "text-primary"
                      : item.status === "pending"
                        ? "text-muted"
                        : "text-foreground",
                  )}
                >
                  {item.label}
                </span>
                {item.description ? (
                  <span className="mt-0.5 block text-xs text-muted">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </>
          );
          return (
            <li
              key={item.id}
              aria-current={item.status === "current" ? "step" : undefined}
              className="relative flex min-w-0 flex-1 items-start gap-2.5 sm:pr-6"
            >
              {index < items.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-4 top-8 h-3 w-px bg-border sm:left-8 sm:top-4 sm:h-px sm:w-[calc(100%-2rem)]",
                    item.status === "completed" && "bg-primary",
                  )}
                />
              ) : null}
              {interactive ? (
                <button
                  type="button"
                  disabled={item.disabled}
                  onClick={() => onStepChange(item.id)}
                  className="relative z-10 flex items-start gap-2.5 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {content}
                </button>
              ) : (
                <div className="relative z-10 flex items-start gap-2.5">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
