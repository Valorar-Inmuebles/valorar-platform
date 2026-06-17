import type { PublicationCheckKey } from "@repo/property-rules";

export type { PublicationCheckKey };

export type PropertyPublishabilityCheck = {
  key: PublicationCheckKey;
  passed: boolean;
  label: string;
  message?: string;
};

export type PropertyPublishabilityResponse = {
  isPublishable: boolean;
  progress: number;
  checks: PropertyPublishabilityCheck[];
  missing: PublicationCheckKey[];
};

export type PublicationChecklistErrorBody = {
  message: string;
  code: "PUBLICATION_CHECKLIST_INCOMPLETE";
  missing: PublicationCheckKey[];
};
