import Image from "next/image";
import { cn } from "@/lib/cn";

export type TenantBrandMarkProps = {
  /** Tenant display name. Falls back to Valorar Inmuebles when omitted. */
  name?: string | null;
  /** Optional tenant logo URL. When present, replaces the text name. */
  logoUrl?: string | null;
  /** Secondary label under the name/logo (expanded only). */
  subtitle?: string;
  collapsed?: boolean;
  className?: string;
};

export const DEFAULT_TENANT_NAME = "Valorar Inmuebles";
export const DEFAULT_TENANT_SUBTITLE = "Panel de Administración";

/** Initials for avatar fallback — up to 2 letters from significant words. */
export function getTenantInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0 && !/^(de|del|la|las|los|y|&)$/i.test(part));

  const first = parts[0];
  const second = parts[1];

  if (!first) {
    return "V";
  }

  if (!second) {
    return first.slice(0, 2).toUpperCase();
  }

  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
}

function TenantAvatar({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
}) {
  const initials = getTenantInitials(name);

  if (logoUrl) {
    return (
      <span
        className={cn(
          "relative flex size-8 shrink-0 overflow-hidden rounded-full bg-white/15 ring-1 ring-white/20",
          className,
        )}
      >
        <Image
          src={logoUrl}
          alt={name}
          fill
          sizes="32px"
          className="object-cover"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-orange text-[11px] font-semibold tracking-wide text-white",
        className,
      )}
      title={name}
    >
      {initials.length > 2 ? initials.slice(0, 1) : initials}
    </span>
  );
}

/**
 * Sidebar brand for the active tenant.
 * Prefers tenant.logo when available; otherwise name (expanded) or initials (collapsed).
 */
export function TenantBrandMark({
  name,
  logoUrl,
  subtitle = DEFAULT_TENANT_SUBTITLE,
  collapsed = false,
  className,
}: TenantBrandMarkProps) {
  const displayName = name?.trim() || DEFAULT_TENANT_NAME;

  if (collapsed) {
    return (
      <TenantAvatar
        name={displayName}
        logoUrl={logoUrl}
        className={className}
      />
    );
  }

  if (logoUrl) {
    return (
      <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
        <span className="relative h-8 w-full max-w-[168px]">
          <Image
            src={logoUrl}
            alt={displayName}
            fill
            sizes="168px"
            className="object-contain object-left"
            priority
          />
        </span>
        <span className="truncate text-[11px] font-medium text-sidebar-muted">
          {subtitle}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span className="truncate text-[15px] font-semibold leading-snug tracking-tight text-sidebar-foreground">
        {displayName}
      </span>
      <span className="truncate text-[11px] font-medium leading-snug text-sidebar-muted">
        {subtitle}
      </span>
    </div>
  );
}
