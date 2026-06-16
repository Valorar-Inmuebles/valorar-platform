"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const VIEWPORT_MARGIN = 8;
const DEFAULT_SHOW_DELAY_MS = 400;

type TooltipProps = {
  /** HTML permitido (p. ej. `<b>`, `<br />`). Los `\n` se convierten a `<br />`. */
  content: string;
  children: ReactNode;
  /** Retardo antes de mostrar con hover (ms). En focus se muestra al instante. Default: 400. */
  showDelayMs?: number;
  /** Clases del contenedor trigger. Default: `inline-flex`. */
  triggerClassName?: string;
  /** Clases del globo del tooltip. */
  contentClassName?: string;
  /** z-index del globo. Default: 50. Usar mayor valor en tooltips anidados. */
  zIndex?: number;
  /** Evita que el hover/active se propague a tooltips contenedores. */
  isolateTrigger?: boolean;
};

const DEFAULT_CONTENT_CLASSNAME =
  "pointer-events-none w-max max-w-[220px] rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-normal leading-snug text-zinc-700 shadow-md [&_b]:font-semibold";

type TooltipPosition = {
  top: number;
  left: number;
  transform: string;
};

function normalizeTooltipHtml(html: string): string {
  return html.trim().replace(/\n/g, "<br />");
}

function getTooltipPlainText(html: string): string {
  return normalizeTooltipHtml(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

export function hasTooltipContent(content: string): boolean {
  return getTooltipPlainText(content).length > 0;
}

function computePosition(
  triggerRect: DOMRect,
  tooltipSize: { width: number; height: number },
): TooltipPosition {
  const { width, height } = tooltipSize;
  const centerX = triggerRect.left + triggerRect.width / 2;

  let left = centerX;
  const minLeft = VIEWPORT_MARGIN + width / 2;
  const maxLeft = window.innerWidth - VIEWPORT_MARGIN - width / 2;
  left = Math.max(minLeft, Math.min(left, maxLeft));

  const spaceAbove = triggerRect.top - VIEWPORT_MARGIN;
  const spaceBelow = window.innerHeight - triggerRect.bottom - VIEWPORT_MARGIN;
  const showAbove = spaceAbove >= height || spaceAbove >= spaceBelow;

  if (showAbove) {
    return {
      top: triggerRect.top - VIEWPORT_MARGIN,
      left,
      transform: "translate(-50%, -100%)",
    };
  }

  return {
    top: triggerRect.bottom + VIEWPORT_MARGIN,
    left,
    transform: "translate(-50%, 0)",
  };
}

const DEFAULT_Z_INDEX = 50;

export function Tooltip({
  content,
  children,
  showDelayMs = DEFAULT_SHOW_DELAY_MS,
  triggerClassName = "inline-flex",
  contentClassName = DEFAULT_CONTENT_CLASSNAME,
  zIndex = DEFAULT_Z_INDEX,
  isolateTrigger = false,
}: TooltipProps) {
  const html = normalizeTooltipHtml(content);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    visibility: "hidden",
    zIndex,
  });

  const clearShowTimeout = useCallback(() => {
    if (showTimeoutRef.current != null) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
  }, []);

  const showNow = useCallback(() => {
    clearShowTimeout();
    setOpen(true);
  }, [clearShowTimeout]);

  const hide = useCallback(() => {
    clearShowTimeout();
    setOpen(false);
  }, [clearShowTimeout]);

  const scheduleShow = useCallback(() => {
    clearShowTimeout();
    if (showDelayMs <= 0) {
      setOpen(true);
      return;
    }
    showTimeoutRef.current = setTimeout(() => {
      showTimeoutRef.current = null;
      setOpen(true);
    }, showDelayMs);
  }, [clearShowTimeout, showDelayMs]);

  useEffect(() => () => clearShowTimeout(), [clearShowTimeout]);

  const syncPosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipSize = {
      width: tooltip.offsetWidth,
      height: tooltip.offsetHeight,
    };
    const pos = computePosition(triggerRect, tooltipSize);

    setStyle({
      position: "fixed",
      top: pos.top,
      left: pos.left,
      transform: pos.transform,
      zIndex,
      visibility: "visible",
    });
  }, [zIndex]);

  useLayoutEffect(() => {
    if (!open) return;
    syncPosition();
  }, [open, html, syncPosition]);

  useEffect(() => {
    if (!open) return;

    const handleReposition = () => syncPosition();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open, syncPosition]);

  if (!hasTooltipContent(content)) return <>{children}</>;

  return (
    <>
      <div
        ref={triggerRef}
        className={triggerClassName}
        onMouseEnter={(e) => {
          if (isolateTrigger) e.stopPropagation();
          scheduleShow();
        }}
        onMouseLeave={(e) => {
          if (isolateTrigger) e.stopPropagation();
          hide();
        }}
        onFocus={(e) => {
          if (isolateTrigger) e.stopPropagation();
          showNow();
        }}
        onBlur={(e) => {
          if (isolateTrigger) e.stopPropagation();
          hide();
        }}
      >
        {children}
      </div>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={style}
            className={contentClassName}
            dangerouslySetInnerHTML={{ __html: html }}
          />,
          document.body,
        )}
    </>
  );
}
