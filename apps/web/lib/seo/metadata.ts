import type { Metadata } from "next";
import { getSiteConfig } from "@/config/site";
import { BRAND_ASSETS } from "@/lib/constants/brand";

export function buildCanonicalPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

type PageMetadataOptions = {
  title: string;
  description: string;
  path?: string;
  openGraph?: Metadata["openGraph"];
  robots?: Metadata["robots"];
  noIndex?: boolean;
};

export function createPageMetadata(options: PageMetadataOptions): Metadata {
  const site = getSiteConfig();
  const canonicalPath = options.path
    ? buildCanonicalPath(options.path)
    : undefined;

  const defaultImage = {
    url: BRAND_ASSETS.logo512,
    width: 512,
    height: 512,
    alt: site.companyName,
  };
  const customOpenGraph = options.openGraph ?? {};
  const images = customOpenGraph.images ?? [defaultImage];
  const imageList = Array.isArray(images) ? images : [images];
  const twitterImages = imageList
    .map((image) => {
      if (typeof image === "string") return image;
      if (image instanceof URL) return image.toString();
      if (typeof image === "object" && image && "url" in image) {
        const url = image.url;
        return typeof url === "string" ? url : url.toString();
      }
      return undefined;
    })
    .filter((url): url is string => Boolean(url));

  return {
    title: options.title,
    description: options.description,
    ...(canonicalPath && {
      alternates: {
        canonical: canonicalPath,
      },
    }),
    openGraph: {
      type: "website",
      locale: "es_AR",
      siteName: site.companyName,
      title: options.title,
      description: options.description,
      url: canonicalPath ? `${site.siteUrl}${canonicalPath}` : site.siteUrl,
      ...customOpenGraph,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description: options.description,
      ...(twitterImages?.length ? { images: twitterImages } : {}),
    },
    robots: options.noIndex
      ? { index: false, follow: true }
      : options.robots,
  };
}

export function createStaticPageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return createPageMetadata({ title, description, path });
}
