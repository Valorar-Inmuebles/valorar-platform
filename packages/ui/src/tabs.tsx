"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./lib/cn";
import {
  firstEnabledIndex,
  lastEnabledIndex,
  nextEnabledIndex,
} from "./lib/list-navigation";

export type TabItem = {
  value: string;
  label: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
  tone?: "default" | "danger";
};

export type TabsProps = {
  id?: string;
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
};

export function Tabs({
  id,
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: TabsProps) {
  const generatedId = useId();
  const tabsId = id ?? generatedId;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = items.findIndex((item) => item.value === value);
  const disabled = items.map((item) => !!item.disabled);

  function focusAndSelect(index: number) {
    const item = items[index];
    if (!item || item.disabled) return;
    onChange(item.value);
    refs.current[index]?.focus();
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let target = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      target = nextEnabledIndex(index, 1, disabled);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      target = nextEnabledIndex(index, -1, disabled);
    } else if (event.key === "Home") {
      target = firstEnabledIndex(disabled);
    } else if (event.key === "End") {
      target = lastEnabledIndex(disabled);
    } else {
      return;
    }
    event.preventDefault();
    focusAndSelect(target);
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex max-w-full gap-1 overflow-x-auto border-b border-border",
        className,
      )}
    >
      {items.map((item, index) => {
        const selected = index === selectedIndex;
        return (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${tabsId}-tab-${index}`}
            aria-selected={selected}
            aria-controls={`${tabsId}-panel-${index}`}
            disabled={item.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => focusAndSelect(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "relative inline-flex min-h-10 shrink-0 items-center gap-2 px-3 text-sm font-medium text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-40",
              selected &&
                (item.tone === "danger"
                  ? "text-red-700 after:bg-red-600"
                  : "text-primary after:bg-primary"),
              selected &&
                "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full",
            )}
          >
            {item.label}
            {item.badge != null ? (
              <span
                className={cn(
                  "rounded-full bg-surface-alt px-1.5 py-0.5 text-xs text-muted",
                  item.tone === "danger" && "bg-red-50 text-red-700",
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export type TabPanelProps = {
  value: string;
  tabValue: string;
  index: number;
  tabsId: string;
  children: ReactNode;
  className?: string;
};

export function TabPanel({
  value,
  tabValue,
  index,
  tabsId,
  children,
  className,
}: TabPanelProps) {
  if (value !== tabValue) return null;
  return (
    <div
      role="tabpanel"
      id={`${tabsId}-panel-${index}`}
      aria-labelledby={`${tabsId}-tab-${index}`}
      tabIndex={0}
      className={cn("outline-none", className)}
    >
      {children}
    </div>
  );
}
