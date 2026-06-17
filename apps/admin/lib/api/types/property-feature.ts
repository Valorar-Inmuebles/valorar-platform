import type { PropertyFeatureCategory } from "@repo/shared-types";

export type AdminPropertyFeature = {
  id: string;
  name: string;
  slug: string;
  category: PropertyFeatureCategory;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminPropertyFeatureAssignment = {
  featureId: string;
  name: string;
  slug: string;
  category: PropertyFeatureCategory;
  value: string | null;
};

export type ReplacePropertyFeatureAssignmentsPayload = {
  features: Array<{
    featureId: string;
    value?: string;
  }>;
};
