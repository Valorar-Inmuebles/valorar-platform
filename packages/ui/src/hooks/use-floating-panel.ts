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
import { overlayCoordinator } from "../lib/overlay-coordinator";

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
  tabBehavior?: "dismiss" | "navigate";
};

export function useFloatingPanel({
  open,
  onClose,
  triggerRef,
  tabBehavior = "dismiss",
}: UseFloatingPanelOptions) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<FloatingPanelStyle | null>(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => {
    closeRef.current = onClose;
  });

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

  const positioned = style !== null;
  useLayoutEffect(() => {
    const root = panelRef.current;
    if (!open || !positioned || !root) return;
    return overlayCoordinator(root.ownerDocument).register({
      root,
      host: root,
      trigger: triggerRef.current,
      modal: false,
      tabBehavior,
      onClose: () => closeRef.current(),
    });
  }, [open, positioned, triggerRef, tabBehavior]);

  const panelStyle: CSSProperties | null = style
    ? {
        position: "fixed",
        top: style.top,
        left: style.left,
        width: style.width,
      }
    : null;

  return { panelRef, panelStyle };
}
