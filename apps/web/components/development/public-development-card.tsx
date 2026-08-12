import Image from "next/image";
import Link from "next/link";
import type { PublicDevelopmentCard } from "@repo/shared-types";
import { formatPrice } from "@/lib/format/price";
import { getDevelopmentStatusLabel } from "@/lib/format/development-status";
import { PropertyFavoriteButton } from "@/components/property/property-favorite-button";
import { PropertyImagePlaceholder } from "@/components/property/property-image-placeholder";

type PublicDevelopmentCardProps = {
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
      className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}

export function PublicDevelopmentCard({
  development,
}: PublicDevelopmentCardProps) {
  const location = resolveLocation(development);
  const statusLabel = getDevelopmentStatusLabel(development.status);

  return (
    <article className="group h-full">
      <Link
        href={`/emprendimientos/${development.slug}`}
        className="flex h-full flex-col overflow-hidden rounded-2xl bg-surface-card ring-1 ring-border-default/80 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand-green/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
      >
        <div className="relative aspect-video shrink-0 overflow-hidden bg-surface-alt">
          <DevelopmentCoverImage development={development} />
          {statusLabel ? (
            <div className="absolute left-3 top-3">
              <span className="inline-flex rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {statusLabel}
              </span>
            </div>
          ) : null}
          <div className="absolute right-3 top-3">
            <PropertyFavoriteButton size="sm" />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4 md:p-5">
          {development.priceFrom != null && development.currency ? (
            <div>
              <p className="text-2xl font-semibold tracking-tight text-text-primary">
                Desde {formatPrice(development.priceFrom, development.currency)}
              </p>
            </div>
          ) : null}

          <h3 className="line-clamp-2 text-base font-medium leading-snug text-text-primary">
            {development.title}
          </h3>

          <p className="line-clamp-2 text-sm text-text-secondary">
            {development.shortDescription}
          </p>

          {location ? (
            <p className="mt-auto line-clamp-1 text-sm text-text-secondary">
              {location}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
