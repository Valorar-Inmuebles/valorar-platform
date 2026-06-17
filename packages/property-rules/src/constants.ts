import type { PublicationCheckKey } from './types';

export const PUBLICATION_CHECKLIST_INCOMPLETE =
  'PUBLICATION_CHECKLIST_INCOMPLETE' as const;

export const PROPERTY_PUBLICATION_CHECK_KEYS: PublicationCheckKey[] = [
  'property-active',
  'has-image',
  'cover-image',
];

export const ACTIVATION_PUBLICATION_CHECK_KEYS: PublicationCheckKey[] = [
  'property-active',
  'has-image',
  'cover-image',
  'primary-price',
];

export const LISTING_PUBLICATION_CHECK_KEYS: PublicationCheckKey[] = [
  'property-active',
  'has-image',
  'cover-image',
  'listing-active',
  'primary-price',
];
