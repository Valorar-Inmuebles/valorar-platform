"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

const FLOATING_PANEL_GAP_PX = 6;

export type FloatingPanelStyle = {
  top: number;
  left: number;
  width: number;
};

type UseFloatingPanelOptions = {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
};

export function useFloatingPanel({
  open,
  onClose,
  triggerRef,
}: UseFloatingPanelOptions) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<FloatingPanelStyle | null>(null);

  const recalc = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    setStyle({
      top: rect.bottom + FLOATING_PANEL_GAP_PX,
      left: rect.left,
      width: rect.width,
    });
  }, [triggerRef]);

  useLayoutEffect(() => {
    if (open) recalc();
    else setStyle(null);
  }, [open, recalc]);

  useEffect(() => {
    if (!open) return;

    window.addEventListener("scroll", recalc, true);
    window.addEventListener("resize", recalc);

    return () => {
      window.removeEventListener("scroll", recalc, true);
      window.removeEventListener("resize", recalc);
    };
  }, [open, recalc]);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (event: MouseEvent) => {
      if (
        panelRef.current?.contains(event.target as Node) ||
        triggerRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      onClose();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, triggerRef]);

  const panelStyle: CSSProperties | null = style
    ? {
        position: "fixed",
        top: style.top,
        left: style.left,
        width: style.width,
        zIndex: 300,
      }
    : null;

  return { panelRef, panelStyle };
}
