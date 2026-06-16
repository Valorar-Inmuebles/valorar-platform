"use client";

import { useEffect, useState } from "react";
import { useActivity } from "@/components/providers/activity-provider";

const SHOW_DELAY_MS = 150;
const TRANSITION_MS = 150;

export function GlobalActivityBar() {
  const { pendingCount } = useActivity();
  const active = pendingCount > 0;

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      const showTimer = window.setTimeout(() => {
        setMounted(true);
        requestAnimationFrame(() => setVisible(true));
      }, SHOW_DELAY_MS);

      return () => {
        window.clearTimeout(showTimer);
      };
    }

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => {
        setMounted(false);
      }, TRANSITION_MS);
    }, 0);

    return () => {
      window.clearTimeout(hideTimer);
    };
  }, [active]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      role="progressbar"
      aria-valuetext="Procesando"
      aria-busy={visible}
      className="relative h-0.5 w-full overflow-hidden bg-blue-600/10 transition-opacity duration-150"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="global-activity-bar-indeterminate absolute inset-y-0 w-1/3 min-w-16 bg-blue-600" />
    </div>
  );
}
