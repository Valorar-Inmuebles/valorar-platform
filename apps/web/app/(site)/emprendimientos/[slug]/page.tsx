import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteContainer } from "@/components/layout/site-container";
import { DevelopmentHeader } from "@/components/development/development-header";
import { DevelopmentPriceCard } from "@/components/development/development-price-card";
import { DevelopmentTypologiesSection } from "@/components/development/development-typologies-section";
import { PropertyDescription } from "@/components/property/property-description";
import { PropertyFeatures } from "@/components/property/property-features";
import { PropertyGallery } from "@/components/property/property-gallery";
import { PropertyMapPlaceholder } from "@/components/property/property-map-placeholder";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { getDevelopmentBySlug } from "@/lib/api/public-development";
import { createPageMetadata } from "@/lib/seo/metadata";
import type { PublicPropertyImage } from "@repo/shared-types";

type DevelopmentDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: DevelopmentDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const development = await getDevelopmentBySlug(slug);

  if (!development) {
    return {
      title: "Emprendimiento no encontrado",
      robots: { index: false, follow: false },
    };
  }

  const title = `${development.title} — Emprendimiento en ${development.city}`;
  const description =
    development.shortDescription?.trim().slice(0, 160) ??
    `Emprendimiento en ${development.city}.`;

  return createPageMetadata({
    title,
    description,
    path: `/emprendimientos/${development.slug}`,
    openGraph: {
      images: development.coverImage.url
        ? [
            {
              url: development.coverImage.url,
              alt: development.coverImage.altText ?? development.title,
            },
          ]
        : undefined,
    },
  });
}

export const revalidate = 300;

export default async function DevelopmentDetailPage({
  params,
}: DevelopmentDetailPageProps) {
  const { slug } = await params;
  const development = await getDevelopmentBySlug(slug);

  if (!development) {
    notFound();
  }

  const galleryImages: PublicPropertyImage[] = development.images.map((image) => ({
    id: image.id,
    url: image.url,
    storageKey: "",
    altText: image.altText,
    sortOrder: image.sortOrder,
    isCover: image.isCover,
  }));

  return (
    <>
      <PropertyGallery images={galleryImages} title={development.title} />

      <SiteContainer className="py-10 md:py-14">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Emprendimientos", href: "/emprendimientos" },
            { label: development.title },
          ]}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="space-y-10">
            <DevelopmentHeader development={development} />

            <PropertyDescription description={development.description} />

            {development.features.length > 0 ? (
              <PropertyFeatures features={development.features} />
            ) : null}

            <PropertyMapPlaceholder
              city={development.city}
              neighborhood={development.neighborhood}
              latitude={development.latitude}
              longitude={development.longitude}
            />

            <DevelopmentTypologiesSection typologies={development.typologies} />
          </div>

          <div className="lg:sticky lg:top-24">
            <DevelopmentPriceCard development={development} />
          </div>
        </div>
      </SiteContainer>
    </>
  );
}
