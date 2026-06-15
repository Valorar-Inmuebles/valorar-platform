"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getNotificaciones,
  markAllNotificacionesAsRead,
  markNotificacionAsRead,
  pollNotificaciones,
} from "@/lib/api/notificaciones.api";
import { detectNuevasNotificaciones } from "@/lib/notificaciones/detect-nuevas-notificaciones";
import { getNotificacionesPollIntervalMs } from "@/lib/notificaciones/notificaciones-poll-interval";
import { playNotificacionSound } from "@/lib/notificaciones/play-notificacion-sound";
import type {
  NotificacionDto,
  NotificacionesPollDto,
  NotificacionesSummaryDto,
} from "@/lib/types/notificacion";

function pollToSnapshot(data: NotificacionesPollDto) {
  return {
    unreadCount: data.unreadCount,
    items: data.unreadItems,
  };
}

export function useNotificaciones() {
  const pollIntervalMs = getNotificacionesPollIntervalMs();
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificacionDto[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const unreadCountRef = useRef(unreadCount);
  const itemsRef = useRef(items);
  const menuOpenRef = useRef(false);
  const previousPollRef = useRef<ReturnType<typeof pollToSnapshot> | null>(null);
  const summaryRef = useRef<NotificacionesSummaryDto | null>(null);

  unreadCountRef.current = unreadCount;
  itemsRef.current = items;

  const applyPoll = useCallback((data: NotificacionesPollDto) => {
    const snapshot = pollToSnapshot(data);
    const previous = previousPollRef.current;
    const hasNew = detectNuevasNotificaciones(previous, snapshot);

    if (
      hasNew &&
      document.visibilityState === "visible" &&
      previous !== null
    ) {
      playNotificacionSound();
    }

    previousPollRef.current = snapshot;
    setUnreadCount(data.unreadCount);

    if (menuOpenRef.current && hasNew) {
      void getNotificaciones()
        .then((summary) => {
          summaryRef.current = summary;
          setItems(summary.items);
          setUnreadCount(summary.unreadCount);
        })
        .catch(() => {
          // Mantener la lista actual si falla el refresh.
        });
    }
  }, []);

  const replaceSummary = useCallback((data: NotificacionesSummaryDto | null) => {
    summaryRef.current = data;
    if (data) {
      setUnreadCount(data.unreadCount);
      setItems(data.items);
    } else {
      setUnreadCount(0);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (document.visibilityState === "hidden") return;

      try {
        const data = await pollNotificaciones();
        if (!cancelled) {
          applyPoll(data);
        }
      } catch {
        // Mantener el último estado conocido en polls fallidos.
      }
    }

    void poll();

    const intervalId = window.setInterval(() => {
      void poll();
    }, pollIntervalMs);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void poll();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pollIntervalMs, applyPoll]);

  const loadFullSummary = useCallback(async () => {
    setLoadingItems(true);
    try {
      const data = await getNotificaciones();
      replaceSummary(data);
      return data;
    } finally {
      setLoadingItems(false);
    }
  }, [replaceSummary]);

  const onMenuOpenChange = useCallback(
    (open: boolean) => {
      menuOpenRef.current = open;
      if (open) {
        void loadFullSummary();
      }
    },
    [loadFullSummary],
  );

  const markAsRead = useCallback(async (id: string) => {
    const currentItems = itemsRef.current;
    const target = currentItems.find((item) => item.id === id);
    if (!target || target.leida) return;

    const previousSummary = summaryRef.current;
    const nextSummary: NotificacionesSummaryDto = {
      unreadCount: Math.max(0, unreadCountRef.current - 1),
      items: currentItems.map((item) =>
        item.id === id ? { ...item, leida: true } : item,
      ),
    };

    replaceSummary(nextSummary);

    try {
      await markNotificacionAsRead(id);
    } catch {
      if (previousSummary) {
        replaceSummary(previousSummary);
      } else {
        await loadFullSummary();
      }
    }
  }, [loadFullSummary, replaceSummary]);

  const markAllAsRead = useCallback(async () => {
    const currentItems = itemsRef.current;
    if (unreadCountRef.current === 0) return;

    const previousSummary = summaryRef.current;
    const nextSummary: NotificacionesSummaryDto = {
      unreadCount: 0,
      items: currentItems.map((item) => ({ ...item, leida: true })),
    };

    replaceSummary(nextSummary);

    try {
      await markAllNotificacionesAsRead();
    } catch {
      if (previousSummary) {
        replaceSummary(previousSummary);
      } else {
        await loadFullSummary();
      }
    }
  }, [loadFullSummary, replaceSummary]);

  return {
    items,
    unreadCount,
    loadingItems,
    onMenuOpenChange,
    markAsRead,
    markAllAsRead,
  };
}
