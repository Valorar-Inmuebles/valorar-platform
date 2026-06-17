export type PublicationCheckKey =
  | 'property-active'
  | 'has-image'
  | 'cover-image'
  | 'listing-active'
  | 'primary-price';

export type PublicationCheckInput = {
  propertyIsActive: boolean;
  imageCount: number;
  hasCoverImage: boolean;
  listingStatus: string;
  hasPrimaryPrice: boolean;
};

export type PublicationCheck = {
  key: PublicationCheckKey;
  passed: boolean;
  label: string;
  message?: string;
};

export type PublicationChecklistResult = {
  isPublishable: boolean;
  progress: number;
  checks: PublicationCheck[];
  missing: PublicationCheckKey[];
};
