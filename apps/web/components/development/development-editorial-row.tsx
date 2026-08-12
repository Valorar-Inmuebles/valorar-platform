import Image from "next/image";
import Link from "next/link";
import type { PublicDevelopmentCard } from "@repo/shared-types";
import { PropertyImagePlaceholder } from "@/components/property/property-image-placeholder";
import { formatPrice } from "@/lib/format/price";
import { getDevelopmentStatusLabel } from "@/lib/format/development-status";

type DevelopmentEditorialRowProps = {
  development: PublicDevelopmentCard;
};

function resolveLocation(development: PublicDevelopmentCard): string {
  const parts = [
    development.neighborhood,
    development.city,
    development.province,
  ].filter(Boolean);

  return [...new Set(parts)].join(", ");
}

function DevelopmentCoverImage({
  development,
}: {
  development: PublicDevelopmentCard;
}) {
  const imageUrl = development.coverImage.url;
  const alt = development.coverImage.altText ?? development.title;

  if (!imageUrl) {
    return <PropertyImagePlaceholder />;
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      fill
      loading="lazy"
      unoptimized
      className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
      sizes="(max-width: 640px) 100vw, 320px"
    />
  );
}

export function DevelopmentEditorialRow({
  development,
}: DevelopmentEditorialRowProps) {
  const location = resolveLocation(development);
  const statusLabel = getDevelopmentStatusLabel(development.status);

  return (
    <article className="group border-b border-border py-8 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-stretch">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-2xl bg-surface-alt sm:w-64 md:w-72 lg:w-80">
          <DevelopmentCoverImage development={development} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-text-primary">
              {development.title}
            </h3>
            {location ? (
              <p className="mt-1 text-sm text-text-secondary">{location}</p>
            ) : null}
          </div>

          {development.priceFrom != null && development.currency ? (
            <p className="text-lg font-semibold tracking-tight text-text-primary">
              Desde {formatPrice(development.priceFrom, development.currency)}
            </p>
          ) : null}

          {development.shortDescription ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-text-secondary">
              {development.shortDescription}
            </p>
          ) : null}

          {statusLabel ? (
            <p className="text-sm font-medium text-text-secondary">{statusLabel}</p>
          ) : null}

          <div className="pt-1">
            <Link
              href={`/emprendimientos/${development.slug}`}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-text-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
            >
              Ver emprendimiento
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
