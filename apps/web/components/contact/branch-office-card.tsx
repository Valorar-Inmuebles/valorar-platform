import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ContactOffice } from "@/lib/contact/contact-content";
import { cn } from "@/lib/cn";

type BranchOfficeCardProps = {
  office: ContactOffice;
  /** Optional map or other content rendered flush under the card body. */
  children?: ReactNode;
  locationHref?: string;
  locationLabel?: string;
  className?: string;
};

export function BranchOfficeCard({
  office,
  children,
  locationHref,
  locationLabel = "Ver ubicación",
  className,
}: BranchOfficeCardProps) {
  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-border-default bg-surface-card",
        className,
      )}
    >
      <div className="relative aspect-video shrink-0 overflow-hidden bg-surface-alt">
        <Image
          src={office.imageSrc}
          alt={office.imageAlt}
          fill
          loading="lazy"
          className={cn("object-cover", office.imageObjectPosition)}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5 md:p-6">
        <h3 className="text-lg font-semibold tracking-tight text-text-primary">
          {office.title}
        </h3>
        <p className="whitespace-pre-line text-sm text-text-secondary">
          {office.address}
        </p>
        {locationHref ? (
          <Link
            href={locationHref}
            className="mt-1 inline-flex w-fit text-sm font-medium text-brand-green underline-offset-4 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
          >
            {locationLabel}
          </Link>
        ) : null}
      </div>

      {children}
    </article>
  );
}
