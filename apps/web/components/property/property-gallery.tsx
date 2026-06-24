"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { PublicPropertyImage } from "@repo/shared-types";
import { SiteContainer } from "@/components/layout/site-container";
import { PropertyImagePlaceholder } from "./property-image-placeholder";

type PropertyGalleryProps = {
  images: PublicPropertyImage[];
  title: string;
};

function GalleryImage({
  image,
  title,
  priority = false,
  className = "",
  onClick,
}: {
  image: PublicPropertyImage;
  title: string;
  priority?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const alt = image.altText ?? title;

  if (!image.url) {
    return (
      <div className={className}>
        <PropertyImagePlaceholder />
      </div>
    );
  }

  const content = (
    <Image
      src={image.url}
      alt={alt}
      fill
      unoptimized
      priority={priority}
      className="object-cover transition duration-500 hover:scale-[1.02]"
      sizes="(max-width: 768px) 100vw, 70vw"
    />
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative overflow-hidden bg-surface-alt ${className}`}
        aria-label={`Ver imagen: ${alt}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-surface-alt ${className}`}>
      {content}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ShowAllPhotosButton({
  onClick,
  className = "",
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border border-border-default bg-surface-card px-4 py-2 text-sm font-medium text-text-primary shadow-sm transition hover:border-brand-green/40 hover:bg-surface-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green ${className}`}
    >
      <GridIcon />
      Ver todas las fotos
    </button>
  );
}

function PhotoCountBadge({ count }: { count: number }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-black/55 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
      <CameraIcon />
      {count} {count === 1 ? "foto" : "fotos"}
    </div>
  );
}

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const sortedImages = [...images].sort(
    (a, b) => a.sortOrder - b.sortOrder || Number(b.isCover) - Number(a.isCover),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const openLightbox = useCallback((index: number) => {
    setActiveIndex(index);
    setIsLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
  }, []);

  const showPrevious = useCallback(() => {
    setActiveIndex((current) =>
      current === 0 ? sortedImages.length - 1 : current - 1,
    );
  }, [sortedImages.length]);

  const showNext = useCallback(() => {
    setActiveIndex((current) =>
      current === sortedImages.length - 1 ? 0 : current + 1,
    );
  }, [sortedImages.length]);

  useEffect(() => {
    if (!isLightboxOpen) {
      return;
    }

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
      }

      if (event.key === "ArrowLeft") {
        showPrevious();
      }

      if (event.key === "ArrowRight") {
        showNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeLightbox, isLightboxOpen, showNext, showPrevious]);

  if (sortedImages.length === 0) {
    return (
      <SiteContainer className="pt-3 pb-2 md:pt-4 md:pb-3">
        <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-surface-alt">
          <PropertyImagePlaceholder />
        </div>
      </SiteContainer>
    );
  }

  const activeImage = sortedImages[activeIndex] ?? sortedImages[0];
  const secondaryImages = sortedImages.slice(1, 5);
  const lastSecondaryIndex = secondaryImages.length - 1;

  function getSecondaryCellClass(index: number, count: number): string {
    const base = "relative min-h-0 overflow-hidden";

    if (count === 1) {
      return `${base} col-span-2 row-span-2`;
    }

    if (count === 2) {
      return `${base} col-span-2`;
    }

    if (count === 3 && index === 2) {
      return `${base} col-span-2`;
    }

    return base;
  }

  return (
    <>
      <SiteContainer className="pt-3 pb-2 md:pt-4 md:pb-3">
        <div className="w-full">
          <div className="md:hidden">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-alt">
              {activeImage ? (
                <GalleryImage
                  image={activeImage}
                  title={title}
                  priority
                  className="absolute inset-0 h-full w-full"
                  onClick={() => openLightbox(activeIndex)}
                />
              ) : null}

              <PhotoCountBadge count={sortedImages.length} />

              {sortedImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={showPrevious}
                    aria-label="Imagen anterior"
                    className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={showNext}
                    aria-label="Imagen siguiente"
                    className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
                  >
                    ›
                  </button>
                  <ShowAllPhotosButton
                    onClick={() => openLightbox(0)}
                    className="absolute bottom-3 right-3"
                  />
                </>
              ) : null}
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-2xl md:grid md:h-[clamp(260px,40vw,460px)] md:grid-cols-4 md:grid-rows-2 md:gap-2">
            <div className="relative col-span-2 row-span-2 min-h-0 overflow-hidden">
              <GalleryImage
                image={sortedImages[0]!}
                title={title}
                priority
                onClick={() => openLightbox(0)}
                className="absolute inset-0 h-full w-full"
              />
              <PhotoCountBadge count={sortedImages.length} />
            </div>
            {secondaryImages.map((image, index) => (
              <div
                key={image.id}
                className={getSecondaryCellClass(index, secondaryImages.length)}
              >
                <GalleryImage
                  image={image}
                  title={title}
                  onClick={() => openLightbox(index + 1)}
                  className="absolute inset-0 h-full w-full"
                />
                {index === lastSecondaryIndex && sortedImages.length > 1 ? (
                  <div className="absolute bottom-3 right-3">
                    <ShowAllPhotosButton onClick={() => openLightbox(0)} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </SiteContainer>

      {isLightboxOpen && activeImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Galería ampliada"
        >
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Cerrar galería"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
          >
            ×
          </button>

          {sortedImages.length > 1 ? (
            <>
              <button
                type="button"
                onClick={showPrevious}
                aria-label="Imagen anterior"
                className="absolute left-4 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={showNext}
                aria-label="Imagen siguiente"
                className="absolute right-4 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white"
              >
                ›
              </button>
            </>
          ) : null}

          <div className="relative h-[70vh] w-full max-w-6xl">
            {activeImage.url ? (
              <Image
                src={activeImage.url}
                alt={activeImage.altText ?? title}
                fill
                unoptimized
                className="object-contain"
                sizes="100vw"
              />
            ) : (
              <PropertyImagePlaceholder />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
