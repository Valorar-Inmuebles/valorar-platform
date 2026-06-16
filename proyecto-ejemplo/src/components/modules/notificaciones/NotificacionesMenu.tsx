"use client";

import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconBell } from "@/components/ui/icons";
import { formatDisplayDateTime } from "@/lib/datetime/format-display-datetime";
import type { NotificacionDto } from "@/lib/types/notificacion";

import { useNotificaciones } from "./useNotificaciones";

function formatUnreadCount(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

function NotificacionItem({
  item,
  onSelect,
}: {
  item: NotificacionDto;
  onSelect: (item: NotificacionDto) => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`mx-1 flex w-[calc(100%-0.5rem)] flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-zinc-100 focus-visible:bg-zinc-100 ${
        item.leida ? "opacity-80" : "bg-indigo-50/40 hover:bg-indigo-50/70"
      } ${item.link ? "cursor-pointer" : ""}`}
      onClick={() => onSelect(item)}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-sm leading-snug ${
            item.leida ? "font-medium text-zinc-700" : "font-semibold text-zinc-900"
          }`}
        >
          {item.titulo}
        </p>
        {!item.leida ? (
          <span
            aria-hidden
            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-indigo-500"
          />
        ) : null}
      </div>
      <div
        className="line-clamp-2 text-xs leading-relaxed text-zinc-500 [&_a]:text-indigo-600 [&_b]:font-semibold [&_strong]:font-semibold"
        dangerouslySetInnerHTML={{ __html: item.mensaje }}
      />
      <p className="text-[11px] text-zinc-400">
        {formatDisplayDateTime(item.createdAt)}
      </p>
    </button>
  );
}

export function NotificacionesMenu() {
  const router = useRouter();
  const {
    items,
    unreadCount,
    loadingItems,
    onMenuOpenChange,
    markAsRead,
    markAllAsRead,
  } = useNotificaciones();

  const handleSelect = async (item: NotificacionDto) => {
    if (!item.leida) {
      await markAsRead(item.id);
    }

    if (item.link) {
      router.push(item.link);
    }
  };

  return (
    <DropdownMenu align="end" onOpenChange={onMenuOpenChange}>
      <DropdownMenuTrigger
        aria-label={
          unreadCount > 0
            ? `Notificaciones (${unreadCount} sin leer)`
            : "Notificaciones"
        }
        title="Notificaciones"
        className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-all duration-200 ease-out hover:bg-zinc-100/90 hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-indigo-500/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.97]"
      >
        <IconBell className="size-[1.125rem]" />
        {unreadCount > 0 ? (
          <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold leading-none text-white">
            {formatUnreadCount(unreadCount)}
          </span>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-0">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Notificaciones</p>
            {unreadCount > 0 ? (
              <p className="mt-0.5 text-xs text-zinc-500">
                {unreadCount} sin leer
              </p>
            ) : null}
          </div>
          {unreadCount > 0 ? (
            <button
              type="button"
              className="shrink-0 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-700"
              onClick={() => void markAllAsRead()}
            >
              Marcar todas
            </button>
          ) : null}
        </div>

        {loadingItems ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-400">
            Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-400">
            No tenés notificaciones
          </div>
        ) : (
          <div className="max-h-[min(24rem,calc(100vh-8rem))] overflow-y-auto py-1.5">
            {items.map((item) => (
              <NotificacionItem
                key={item.id}
                item={item}
                onSelect={(selected) => void handleSelect(selected)}
              />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
