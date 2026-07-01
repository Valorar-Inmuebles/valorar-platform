import { notFound, redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo/metadata";
import { buildLandingPath, parseLandingSegments } from "@/lib/seo/landing-routes";
import { resolveLandingRedirect } from "@/lib/seo/resolve-landing-redirect";

type ExplorarLandingPageProps = {
  params: Promise<{ segments: string[] }>;
};

export async function generateMetadata({
  params,
}: ExplorarLandingPageProps) {
  const { segments } = await params;
  const parsed = parseLandingSegments(segments);

  if (!parsed) {
    return createPageMetadata({
      title: "Explorar propiedades",
      description: "Explorá propiedades por zona, tipo y operación.",
      path: `/explorar/${segments.join("/")}`,
      noIndex: true,
    });
  }

  const titleParts = [
    parsed.localitySlug?.replace(/-/g, " "),
    parsed.provinceSlug?.replace(/-/g, " "),
    parsed.propertyTypeSlug?.replace(/-/g, " "),
    parsed.listingTypeSlug,
  ].filter(Boolean);

  return createPageMetadata({
    title: titleParts.join(" · ") || "Explorar propiedades",
    description: "Explorá propiedades por zona, tipo y operación.",
    path: buildLandingPath(parsed),
    noIndex: true,
  });
}

export default async function ExplorarLandingPage({
  params,
}: ExplorarLandingPageProps) {
  const { segments } = await params;
  const target = await resolveLandingRedirect(segments);

  if (!target) {
    notFound();
  }

  redirect(target);
}
