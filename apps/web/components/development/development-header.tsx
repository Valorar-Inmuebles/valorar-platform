import type { PublicDevelopmentDetail } from "@repo/shared-types";
import { getDevelopmentStatusLabel } from "@/lib/format/development-status";
import { formatDevelopmentParkingLabel } from "@/lib/development/development-display";

type DevelopmentHeaderProps = {
  development: PublicDevelopmentDetail;
};

function resolveLocation(development: PublicDevelopmentDetail): string {
  const parts = [
    development.neighborhood,
    development.city,
    development.province,
  ].filter(Boolean);

  return [...new Set(parts)].join(", ");
}

export function DevelopmentHeader({ development }: DevelopmentHeaderProps) {
  const location = resolveLocation(development);
  const statusLabel = getDevelopmentStatusLabel(development.status);
  const parkingLabel = formatDevelopmentParkingLabel(development);

  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {statusLabel ? (
          <span className="inline-flex rounded-full bg-surface-alt px-3 py-1 text-xs font-medium text-text-secondary ring-1 ring-border-default">
            {statusLabel}
          </span>
        ) : null}
      </div>

      <h1 className="text-3xl font-semibold tracking-tight text-text-primary md:text-4xl">
        {development.title}
      </h1>

      {development.shortDescription ? (
        <p className="text-lg text-text-secondary">{development.shortDescription}</p>
      ) : null}

      {location ? (
        <p className="text-sm text-text-secondary">{location}</p>
      ) : null}

      {parkingLabel ? (
        <p className="text-sm text-text-secondary">{parkingLabel}</p>
      ) : null}
    </header>
  );
}
