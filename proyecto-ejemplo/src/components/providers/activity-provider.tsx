"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  finishActivity,
  getActivitySnapshot,
  getServerActivitySnapshot,
  startActivity,
  subscribeActivity,
} from "@/lib/activity/activity-store";

export type ActivityContextValue = {
  isActive: boolean;
  pendingCount: number;
  start: () => void;
  finish: () => void;
};

const ActivityContext = createContext<ActivityContextValue | null>(null);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const pendingCount = useSyncExternalStore(
    subscribeActivity,
    getActivitySnapshot,
    getServerActivitySnapshot,
  );

  const value = useMemo<ActivityContextValue>(
    () => ({
      isActive: pendingCount > 0,
      pendingCount,
      start: startActivity,
      finish: finishActivity,
    }),
    [pendingCount],
  );

  return (
    <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
  );
}

export function useActivity(): ActivityContextValue {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error("useActivity must be used within ActivityProvider");
  }
  return context;
}
