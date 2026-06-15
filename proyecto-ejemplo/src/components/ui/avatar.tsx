"use client";

import { useEffect, useState } from "react";

import {
  getCachedUsuarioFotoUrl,
  loadUsuarioFoto,
} from "@/lib/client/avatar-foto-cache";

function initialsFromName(name: string, max = 2) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-9 text-sm",
  lg: "size-10 text-sm",
} as const;

export type AvatarProps = {
  usuarioId: string;
  name: string;
  hasFoto?: boolean;
  alt?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
};

function useUsuarioFoto(usuarioId: string, hasFoto?: boolean) {
  const [src, setSrc] = useState<string | null>(() => {
    if (!usuarioId || !hasFoto) return null;
    return getCachedUsuarioFotoUrl(usuarioId);
  });

  useEffect(() => {
    if (!usuarioId || !hasFoto) {
      setSrc(null);
      return;
    }

    const cached = getCachedUsuarioFotoUrl(usuarioId);
    if (cached) {
      setSrc(cached);
      return;
    }

    let cancelled = false;
    void loadUsuarioFoto(usuarioId).then((url) => {
      if (!cancelled) setSrc(url);
    });

    return () => {
      cancelled = true;
    };
  }, [usuarioId, hasFoto]);

  return src;
}

export function Avatar({
  usuarioId,
  name,
  hasFoto = false,
  alt,
  size = "md",
  className = "",
}: AvatarProps) {
  const fotoSrc = useUsuarioFoto(usuarioId, hasFoto);
  const initials = initialsFromName(name);
  const label = alt ?? name;

  const shell = `relative inline-flex shrink-0 overflow-hidden rounded-full font-medium shadow-md shadow-zinc-900/10 ring-2 ring-white ${sizeClasses[size]} ${className}`;

  if (fotoSrc) {
    return (
      <span className={`bg-zinc-100 ${shell}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fotoSrc}
          alt={label}
          className="size-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex select-none items-center justify-center ${shell} ${
        className ? "" : "bg-gradient-to-br from-zinc-100 to-zinc-200/90 text-zinc-700"
      }`}
    >
      {initials}
    </span>
  );
}
