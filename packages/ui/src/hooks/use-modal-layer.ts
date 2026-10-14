"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { overlayCoordinator } from "../lib/overlay-coordinator";

/** Keep the layer registered through its exit animation, not just while open. */
export function useModalLayer({
  open,
  mounted,
  panelRef,
  onClose,
}: {
  open: boolean;
  mounted: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  const callback = useRef(onClose);
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    callback.current = () => {
      if (open) onClose();
    };
  });
  useLayoutEffect(() => {
    if (open && !mounted)
      opener.current = overlayCoordinator(document).captureTrigger();
  }, [open, mounted]);
  useLayoutEffect(() => {
    const root = panelRef.current;
    if (!mounted || !root) return;
    return overlayCoordinator(root.ownerDocument).register({
      root,
      host: root.parentElement!,
      modal: true,
      trigger: opener.current,
      onClose: () => callback.current(),
    });
  }, [mounted, panelRef]);
}
