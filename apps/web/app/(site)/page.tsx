import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryGrid } from "@/components/home/category-grid";
import { FeaturedPropertiesSection } from "@/components/home/featured-properties-section";
import { HeroSection } from "@/components/home/hero-section";
import { RecentPropertiesSection } from "@/components/home/recent-properties-section";
import { PropertyGridSkeleton } from "@/components/property/property-grid-skeleton";
import { OrganizationJsonLd } from "@/components/seo/organization-json-ld";
import { getSiteConfig } from "@/config/site";
import {
  getFeaturedProperties,
  getRecentProperties,
} from "@/lib/api/public-property";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import { createPageMetadata } from "@/lib/seo/metadata";

export function generateMetadata(): Metadata {
  const site = getSiteConfig();

  return createPageMetadata({
    title: `${site.companyName} — Inmobiliaria`,
    description: site.description,
    path: "/",
    openGraph: {
      images: [
        {
          url: BRAND_ASSETS.hero,
          width: 1920,
          height: 1080,
          alt: site.companyName,
        },
      ],
    },
  });
}

export const revalidate = 300;

async function FeaturedSection() {
  const { data: properties, unavailable } = await getFeaturedProperties(3);

  return (
    <FeaturedPropertiesSection
      properties={properties}
      unavailable={unavailable}
    />
  );
}

async function RecentSection() {
  const { data: properties, unavailable } = await getRecentProperties(8);

  return (
    <RecentPropertiesSection
      properties={properties}
      unavailable={unavailable}
    />
  );
}

export default function HomePage() {
  return (
    <>
      <OrganizationJsonLd />

      <HeroSection />

      <Suspense
        fallback={
          <section className="py-16 md:py-20">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <PropertyGridSkeleton count={3} columns="featured" />
            </div>
          </section>
        }
      >
        <FeaturedSection />
      </Suspense>

      <Suspense
        fallback={
          <section className="bg-surface-alt py-16 md:py-20">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <PropertyGridSkeleton count={8} columns="recent" />
            </div>
          </section>
        }
      >
        <RecentSection />
      </Suspense>

      <CategoryGrid />
    </>
  );
}
