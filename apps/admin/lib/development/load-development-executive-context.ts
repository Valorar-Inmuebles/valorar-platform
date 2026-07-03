import { listDevelopmentFeatureAssignments } from "@/lib/api/development-feature-assignment";
import { listDevelopmentImages } from "@/lib/api/development-image";
import { listDevelopmentTypologies } from "@/lib/api/development-typology";
import { getDevelopment } from "@/lib/api/development";
import {
  buildDevelopmentExecutiveSnapshot,
  type DevelopmentExecutiveSnapshot,
} from "@/lib/development/development-executive";
import type { AdminDevelopment } from "@/lib/api/types/development";

export type DevelopmentExecutiveContext = {
  development: AdminDevelopment;
  snapshot: DevelopmentExecutiveSnapshot;
};

export async function loadDevelopmentExecutiveContext(
  developmentId: string,
): Promise<DevelopmentExecutiveContext> {
  const [development, images, features, typologies] = await Promise.all([
    getDevelopment(developmentId),
    listDevelopmentImages(developmentId),
    listDevelopmentFeatureAssignments(developmentId),
    listDevelopmentTypologies(developmentId),
  ]);

  const snapshot = buildDevelopmentExecutiveSnapshot({
    development,
    imageCount: images.length,
    hasCoverImage: images.some((image) => image.isCover),
    featureCount: features.length,
    typologyCount: typologies.length,
  });

  return {
    development,
    snapshot,
  };
}
