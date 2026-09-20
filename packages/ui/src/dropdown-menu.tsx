"use client";

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useFloatingPanel } from "./hooks/use-floating-panel";
import { cn } from "./lib/cn";
import {
  firstEnabledIndex,
  lastEnabledIndex,
  nextEnabledIndex,
} from "./lib/list-navigation";

export type DropdownMenuItem = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  onSelect: () => void;
};

export type DropdownMenuProps = {
  trigger: ReactNode;
  items: DropdownMenuItem[];
  ariaLabel: string;
  disabled?: boolean;
  align?: "start" | "end";
  className?: string;
};

export function DropdownMenu({
  trigger,
  items,
  ariaLabel,
  disabled = false,
  align = "end",
  className,
}: DropdownMenuProps) {
  const generatedId = useId();
  const menuId = `${generatedId}-menu`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const disabledItems = items.map((item) => !!item.disabled);
  const { panelRef, panelStyle } = useFloatingPanel({
    open,
    onClose: () => {
      setOpen(false);
      setActiveIndex(-1);
    },
    triggerRef,
  });

  function openAt(index: number) {
    if (disabled || index < 0) return;
    setActiveIndex(index);
    setOpen(true);
    requestAnimationFrame(() => itemRefs.current[index]?.focus());
  }

  function close(returnFocus = true) {
    setOpen(false);
    setActiveIndex(-1);
    if (returnFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openAt(firstEnabledIndex(disabledItems));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAt(lastEnabledIndex(disabledItems));
    }
  }

  function handleItemKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let target = index;
    if (event.key === "ArrowDown") {
      target = nextEnabledIndex(index, 1, disabledItems);
    } else if (event.key === "ArrowUp") {
      target = nextEnabledIndex(index, -1, disabledItems);
    } else if (event.key === "Home") {
      target = firstEnabledIndex(disabledItems);
    } else if (event.key === "End") {
      target = lastEnabledIndex(disabledItems);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    } else if (event.key === "Tab") {
      setOpen(false);
      return;
    } else {
      return;
    }
    event.preventDefault();
    setActiveIndex(target);
    itemRefs.current[target]?.focus();
  }

  const panelWidth = Math.min(
    Math.max(Number(panelStyle?.width ?? 0), 180),
    typeof window === "undefined" ? 180 : window.innerWidth - 16,
  );
  const desiredLeft =
    align === "end"
      ? Number(panelStyle?.left ?? 0) +
        Number(panelStyle?.width ?? 0) -
        panelWidth
      : Number(panelStyle?.left ?? 0);
  const adjustedStyle = panelStyle
    ? {
        ...panelStyle,
        left: Math.max(
          8,
          Math.min(desiredLeft, window.innerWidth - panelWidth - 8),
        ),
        width: panelWidth,
      }
    : null;

  return (
    <div className={cn("inline-flex", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() =>
          open ? close(false) : openAt(firstEnabledIndex(disabledItems))
        }
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {trigger}
      </button>
      {open && adjustedStyle
        ? createPortal(
            <div
              ref={panelRef}
              id={menuId}
              role="menu"
              aria-label={ariaLabel}
              style={adjustedStyle}
              className="rounded-xl border border-border bg-surface py-1.5 shadow-xl"
            >
              {items.map((item, index) => (
                <button
                  key={item.id}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  tabIndex={index === activeIndex ? 0 : -1}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    item.onSelect();
                    close();
                  }}
                  onKeyDown={(event) => handleItemKeyDown(event, index)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm outline-none hover:bg-surface-alt focus:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-40",
                    item.destructive ? "text-red-700" : "text-foreground",
                  )}
                >
                  {item.icon ? (
                    <span className="inline-flex shrink-0">{item.icon}</span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
