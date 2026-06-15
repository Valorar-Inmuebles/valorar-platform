import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryGrid } from "@/components/home/category-grid";
import { FeaturedPropertiesSection } from "@/components/home/featured-properties-section";
import { HeroSection } from "@/components/home/hero-section";
import { RecentPropertiesSection } from "@/components/home/recent-properties-section";
import { PropertyGridSkeleton } from "@/components/property/property-grid-skeleton";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import {
  getFeaturedProperties,
  getRecentProperties,
} from "@/lib/api/public-property";

export const metadata: Metadata = {
  title: "Valorar Inmuebles",
  description: "Inmuebles, alquileres, ventas y emprendimientos.",
  openGraph: {
    title: "Valorar Inmuebles",
    description: "Inmuebles, alquileres, ventas y emprendimientos.",
    images: [
      {
        url: BRAND_ASSETS.logo512,
        width: 512,
        height: 512,
        alt: "Valorar Inmuebles",
      },
    ],
  },
};

export const revalidate = 300;

async function FeaturedSection() {
  const properties = await getFeaturedProperties(3);

  return <FeaturedPropertiesSection properties={properties} />;
}

async function RecentSection() {
  const properties = await getRecentProperties(8);

  return <RecentPropertiesSection properties={properties} />;
}

export default function HomePage() {
  return (
    <>
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
          <section className="bg-slate-50 py-16 md:py-20">
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
