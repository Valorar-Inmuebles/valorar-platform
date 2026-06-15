"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { PublicPropertyImage } from "@repo/shared-types";
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
      className="object-cover"
      sizes="(max-width: 768px) 100vw, 70vw"
    />
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative overflow-hidden bg-slate-100 ${className}`}
        aria-label={`Ver imagen: ${alt}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      {content}
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
      <div className="aspect-[16/10] w-full bg-slate-100">
        <PropertyImagePlaceholder />
      </div>
    );
  }

  const activeImage = sortedImages[activeIndex] ?? sortedImages[0];

  return (
    <>
      <div className="w-full">
        <div className="md:hidden">
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
            {activeImage ? (
              <GalleryImage
                image={activeImage}
                title={title}
                priority
                className="absolute inset-0 h-full w-full"
                onClick={() => openLightbox(activeIndex)}
              />
            ) : null}

            {sortedImages.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={showPrevious}
                  aria-label="Imagen anterior"
                  className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  aria-label="Imagen siguiente"
                  className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
                >
                  ›
                </button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {sortedImages.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      aria-label={`Ver imagen ${index + 1}`}
                      onClick={() => setActiveIndex(index)}
                      className={`h-2 w-2 rounded-full ${
                        index === activeIndex ? "bg-white" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="hidden md:grid md:grid-cols-4 md:grid-rows-2 md:gap-2 md:px-0 lg:gap-3">
          <GalleryImage
            image={sortedImages[0]!}
            title={title}
            priority
            onClick={() => openLightbox(0)}
            className="col-span-2 row-span-2 aspect-[16/10] w-full rounded-l-2xl md:rounded-l-2xl md:rounded-r-none"
          />
          {sortedImages.slice(1, 5).map((image, index) => (
            <GalleryImage
              key={image.id}
              image={image}
              title={title}
              onClick={() => openLightbox(index + 1)}
              className={`aspect-[4/3] w-full ${
                index === 1 ? "rounded-tr-2xl" : index === 3 ? "rounded-br-2xl" : ""
              }`}
            />
          ))}
        </div>
      </div>

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
