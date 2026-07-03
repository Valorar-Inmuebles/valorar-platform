export type AdminDevelopmentTypologyFeatureAssignment = {
  featureId: string;
  name: string;
  slug: string;
  category: string;
  value: string | null;
};

export type ReplaceDevelopmentTypologyFeatureAssignmentsPayload = {
  features: Array<{ featureId: string; value?: string }>;
};
