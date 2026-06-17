import {
  ACTIVATION_PUBLICATION_CHECK_KEYS,
  LISTING_PUBLICATION_CHECK_KEYS,
  PROPERTY_PUBLICATION_CHECK_KEYS,
} from './constants';
import {
  getPublicationCheckLabel,
  getPublicationCheckMessage,
} from './labels';
import type {
  PublicationCheck,
  PublicationCheckInput,
  PublicationCheckKey,
  PublicationChecklistResult,
} from './types';

function evaluateSingleCheck(
  key: PublicationCheckKey,
  input: PublicationCheckInput,
): PublicationCheck {
  let passed = false;

  switch (key) {
    case 'property-active':
      passed = input.propertyIsActive;
      break;
    case 'has-image':
      passed = input.imageCount >= 1;
      break;
    case 'cover-image':
      passed = input.hasCoverImage;
      break;
    case 'listing-active':
      passed = input.listingStatus === 'ACTIVE';
      break;
    case 'primary-price':
      passed = input.hasPrimaryPrice;
      break;
  }

  const check: PublicationCheck = {
    key,
    passed,
    label: getPublicationCheckLabel(key),
  };

  if (!passed) {
    check.message = getPublicationCheckMessage(key);
  }

  return check;
}

function evaluateChecks(
  input: PublicationCheckInput,
  keys: PublicationCheckKey[],
): PublicationChecklistResult {
  const checks = keys.map((key) => evaluateSingleCheck(key, input));
  const missing = checks.filter((check) => !check.passed).map((check) => check.key);
  const passedCount = checks.filter((check) => check.passed).length;

  return {
    isPublishable: missing.length === 0,
    progress:
      checks.length === 0 ? 0 : Math.round((passedCount / checks.length) * 100),
    checks,
    missing,
  };
}

export function evaluatePropertyPublishability(
  input: Pick<
    PublicationCheckInput,
    'propertyIsActive' | 'imageCount' | 'hasCoverImage'
  >,
): PublicationChecklistResult {
  return evaluateChecks(
    {
      propertyIsActive: input.propertyIsActive,
      imageCount: input.imageCount,
      hasCoverImage: input.hasCoverImage,
      listingStatus: 'ACTIVE',
      hasPrimaryPrice: true,
    },
    PROPERTY_PUBLICATION_CHECK_KEYS,
  );
}

export function evaluateListingPublishability(
  input: PublicationCheckInput,
): PublicationChecklistResult {
  return evaluateChecks(input, LISTING_PUBLICATION_CHECK_KEYS);
}

export function evaluateActivationChecklist(
  input: PublicationCheckInput,
): PublicationChecklistResult {
  return evaluateChecks(input, ACTIVATION_PUBLICATION_CHECK_KEYS);
}
