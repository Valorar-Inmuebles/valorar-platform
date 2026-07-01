import type { PlatformRole } from "@/lib/permissions";

const AVATAR_PALETTE = [
  "bg-emerald-100 text-emerald-800 ring-emerald-200",
  "bg-sky-100 text-sky-800 ring-sky-200",
  "bg-violet-100 text-violet-800 ring-violet-200",
  "bg-amber-100 text-amber-900 ring-amber-200",
  "bg-rose-100 text-rose-800 ring-rose-200",
  "bg-teal-100 text-teal-800 ring-teal-200",
] as const;

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "VA";
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function getAvatarColorClass(seed: string): string {
  const index = hashString(seed) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index]!;
}

export type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  seed?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASSES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
} as const;

export function UserAvatar({
  name,
  avatarUrl,
  seed,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const initials = getUserInitials(name);
  const colorClass = getAvatarColorClass(seed ?? name);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${SIZE_CLASSES[size]} shrink-0 rounded-full object-cover ring-1 ring-border ${className}`}
      />
    );
  }

  return (
    <div
      className={`${SIZE_CLASSES[size]} flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ${colorClass} ${className}`}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  );
}

export function getRoleLabel(role: PlatformRole): string {
  const labels: Record<PlatformRole, string> = {
    SUPER_ADMIN: "Super Admin",
    TENANT_ADMIN: "Administrador",
    MANAGER: "Manager",
    AGENT: "Agente",
    COLLABORATOR: "Colaborador",
  };

  return labels[role] ?? role;
}
