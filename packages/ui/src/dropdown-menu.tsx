"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
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
  asChild?: boolean;
  items: DropdownMenuItem[];
  ariaLabel: string;
  disabled?: boolean;
  align?: "start" | "end";
  className?: string;
};

export function DropdownMenu({
  trigger,
  asChild = false,
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

  const triggerProps = {
    type: "button" as const,
    disabled,
    "aria-label": ariaLabel,
    "aria-haspopup": "menu" as const,
    "aria-expanded": open,
    "aria-controls": menuId,
    onClick: () =>
      open ? close(false) : openAt(firstEnabledIndex(disabledItems)),
    onKeyDown: handleTriggerKeyDown,
  };

  let triggerElement: ReactNode;
  if (asChild) {
    if (!isValidElement<ButtonHTMLAttributes<HTMLButtonElement>>(trigger)) {
      throw new Error(
        "DropdownMenu with asChild requires a single element trigger.",
      );
    }
    const child = trigger as ReactElement<
      ButtonHTMLAttributes<HTMLButtonElement> & {
        ref?: Ref<HTMLButtonElement>;
      }
    >;
    triggerElement = cloneElement(child, {
      ...triggerProps,
      disabled: disabled || child.props.disabled,
      ref: (node: HTMLButtonElement | null) => {
        triggerRef.current = node;
        const childRef = child.props.ref;
        if (typeof childRef === "function") childRef(node);
        else if (childRef) childRef.current = node;
      },
      onClick: (event) => {
        child.props.onClick?.(event);
        if (!event.defaultPrevented) triggerProps.onClick();
      },
      onKeyDown: (event) => {
        child.props.onKeyDown?.(event);
        if (!event.defaultPrevented) triggerProps.onKeyDown(event);
      },
    });
  } else {
    triggerElement = (
      <button
        ref={triggerRef}
        {...triggerProps}
        className="inline-flex items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {trigger}
      </button>
    );
  }

  return (
    <div className={cn("inline-flex", className)}>
      {triggerElement}
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
