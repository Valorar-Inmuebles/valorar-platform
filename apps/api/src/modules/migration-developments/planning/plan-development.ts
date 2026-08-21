import * as fs from 'node:fs';
import {
  DEVELOPMENT_ENTITY_TYPE,
  DEVELOPMENTS_SOURCE_SYSTEM,
  INTERNAL_CODE_PREFIX,
} from '../constants';
import type { OfflineGeoCatalog } from '../catalog/caba-geo-catalog';
import { resolveAgainstCatalog } from '../catalog/resolve-geo';
import { getSourceOverride } from '../overrides/source-overrides';
import { composeDescriptions } from '../parsing/descriptions';
import { detectFeatures } from '../parsing/features';
import { detectFinancing } from '../parsing/financing';
import { detectLocation } from '../parsing/location';
import {
  normalizeEditorialText,
  slugifyTitle,
  stripDuplicateConsecutiveSentences,
} from '../parsing/normalize-text';
import { detectParking } from '../parsing/parking';
import { detectStatus } from '../parsing/status';
import { parseStreetFromTitle } from '../parsing/street';
import { detectTypologies } from '../parsing/typologies';
import type {
  DevelopmentPlan,
  EditorialCorrection,
  FolderInventory,
  PlanStatus,
  SourceIssue,
} from '../types';
import { sha256Json } from './fingerprint';

function applyFragments(
  text: string,
  fragments: string[] | undefined,
): {
  text: string;
  removed: string[];
} {
  if (!fragments?.length) {
    return { text, removed: [] };
  }

  let next = text;
  const removed: string[] = [];
  for (const fragment of fragments) {
    if (next.includes(fragment)) {
      const before = next;
      next = next
        .replace(fragment, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (before !== next) {
        removed.push(fragment);
      }
    }
  }
  return { text: next, removed };
}

function uniqueIssues(issues: SourceIssue[]): SourceIssue[] {
  const seen = new Set<string>();
  const result: SourceIssue[] = [];
  for (const issue of issues) {
    const key = `${issue.code}:${issue.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(issue);
  }
  return result;
}

function resolvePlanStatus(issues: SourceIssue[]): PlanStatus {
  if (issues.some((issue) => issue.blocking || issue.severity === 'error')) {
    return 'blocked';
  }
  if (issues.some((issue) => issue.severity === 'warning')) {
    return 'ready_with_warnings';
  }
  return 'ready';
}

function applyStatusOverride(
  detectedStatus: ReturnType<typeof detectStatus>['status'],
  detectedIssues: SourceIssue[],
  overrideStatus: ReturnType<typeof detectStatus>['status'] | undefined,
  overrideReason: string | undefined,
): {
  status: ReturnType<typeof detectStatus>['status'];
  issues: SourceIssue[];
} {
  if (overrideStatus === undefined) {
    return { status: detectedStatus, issues: detectedIssues };
  }

  let nextIssues = detectedIssues.filter(
    (issue) => issue.code !== 'UNKNOWN_DEVELOPMENT_STATUS',
  );

  if (overrideStatus === 'COMPLETED') {
    nextIssues = nextIssues.filter(
      (issue) => issue.code !== 'STALE_DEVELOPMENT_STATUS',
    );
  }

  if (detectedStatus !== overrideStatus) {
    nextIssues = [
      ...nextIssues,
      {
        code: 'SOURCE_STATUS_OVERRIDDEN',
        severity: 'warning',
        blocking: false,
        message: `Status overridden from ${detectedStatus ?? 'null'} to ${overrideStatus}. ${overrideReason ?? 'Approved override.'}`,
      },
    ];
  }

  return { status: overrideStatus, issues: nextIssues };
}

export function planDevelopment(
  inventory: FolderInventory,
  options: {
    now?: Date;
    tenantId?: string;
    geoCatalog?: OfflineGeoCatalog;
  } = {},
): DevelopmentPlan {
  const override = getSourceOverride(inventory.sourceId);
  const issues: SourceIssue[] = [...inventory.issues];
  const editorialCorrections: EditorialCorrection[] = [];

  let rawText = '';
  if (inventory.txtFiles.length === 1) {
    rawText = fs.readFileSync(inventory.txtFiles[0], 'utf8');
  }

  const normalized = normalizeEditorialText(rawText);
  let workingText = normalized.text;
  if (normalized.encodingCorrected) {
    issues.push({
      code: 'ENCODING_CORRECTED',
      severity: 'warning',
      blocking: false,
      message: 'Broken encoding or unambiguous spelling was corrected.',
    });
    editorialCorrections.push({
      field: 'txt',
      original: rawText.slice(0, 180),
      normalized: workingText.slice(0, 180),
      reason: 'encoding/spelling normalization',
    });
  }

  if (override?.textReplacements) {
    for (const replacement of override.textReplacements) {
      if (workingText.includes(replacement.from)) {
        workingText = workingText.split(replacement.from).join(replacement.to);
        editorialCorrections.push({
          field: 'txt',
          original: replacement.from,
          normalized: replacement.to,
          reason: replacement.reason,
        });
      }
    }
  }

  const duplicatePass = stripDuplicateConsecutiveSentences(workingText);
  workingText = duplicatePass.text;
  const fragmentPass = applyFragments(workingText, override?.excludeFragments);
  workingText = fragmentPass.text;
  const removedFragments = [...duplicatePass.removed, ...fragmentPass.removed];
  if (removedFragments.length > 0) {
    issues.push({
      code: 'DUPLICATE_FRAGMENT_REMOVED',
      severity: 'warning',
      blocking: false,
      message: `Removed duplicated fragment(s): ${removedFragments.join(' | ')}`,
    });
    editorialCorrections.push({
      field: 'description',
      original: removedFragments.join(' | '),
      normalized: '(removed duplicate)',
      reason: override?.reason ?? 'consecutive duplicate sentence',
    });
  }

  const folderTitle = inventory.publicNameFromFolder;
  const title = override?.title ?? folderTitle;
  if (override?.title && override.title !== folderTitle) {
    issues.push({
      code: 'TITLE_NORMALIZED',
      severity: 'warning',
      blocking: false,
      message: `Public title normalized from "${folderTitle}" to "${override.title}".`,
    });
    editorialCorrections.push({
      field: 'title',
      original: folderTitle,
      normalized: override.title,
      reason: override.reason,
    });
  }

  const firstLine = workingText.split('\n').find((line) => line.trim()) ?? '';
  const titleInTxt = firstLine
    .toLowerCase()
    .includes(title.split(' ')[0]?.toLowerCase() ?? '');
  if (workingText && !titleInTxt) {
    issues.push({
      code: 'MISSING_TITLE_IN_TXT',
      severity: 'warning',
      blocking: false,
      message: 'The TXT does not start with the public development name.',
    });
  }

  if (
    inventory.sourceId === '013' ||
    /\btipo\s+ph\b/i.test(workingText) ||
    /\bpor escalera\b/i.test(workingText)
  ) {
    issues.push({
      code: 'UNIT_LIKE_COPY',
      severity: 'warning',
      blocking: false,
      message:
        'Source copy reads like a unit/PH listing. It is still planned as a Development.',
    });
  }

  const statusDetection = detectStatus(workingText, options.now);
  const statusResult = applyStatusOverride(
    statusDetection.status,
    statusDetection.issues,
    override?.status,
    override?.statusReason ?? override?.reason,
  );
  const status = statusResult.status;
  issues.push(...statusResult.issues);

  const financing = detectFinancing(workingText);
  issues.push(...financing.issues);

  const parking = detectParking(workingText);
  issues.push(...parking.issues);

  const features = detectFeatures(workingText);
  const matchedFeatures = features.matchedFeatures.filter(
    (feature) => !override?.excludeFeatureSlugs?.includes(feature.slug),
  );

  const locationResult = detectLocation(workingText, override?.localityName);
  const catalogResult = resolveAgainstCatalog({
    provinceName:
      override?.provinceName ?? locationResult.location.provinceName,
    localityName: locationResult.location.localityName,
    evidence: locationResult.location.evidence,
    candidates: locationResult.location.candidates,
    catalog: options.geoCatalog,
  });

  if (catalogResult.location.status === 'resolved') {
    issues.push(
      ...locationResult.issues.filter(
        (issue) =>
          issue.code !== 'UNRESOLVED_LOCALITY' &&
          issue.code !== 'AMBIGUOUS_LOCALITY',
      ),
    );
  } else if (catalogResult.location.status === 'missing') {
    issues.push(
      ...locationResult.issues.filter(
        (issue) => issue.code !== 'UNRESOLVED_LOCALITY',
      ),
      ...catalogResult.issues,
    );
  } else {
    issues.push(...locationResult.issues, ...catalogResult.issues);
  }

  const parsedStreet = parseStreetFromTitle(title);
  const street = override?.street ?? parsedStreet.street;
  const streetNumber = override?.streetNumber ?? parsedStreet.streetNumber;

  const copy = composeDescriptions({
    title,
    rawText: workingText,
    financingLines: financing.sourceLines,
  });

  const unique = uniqueIssues(issues);
  const errors = unique.filter((issue) => issue.severity === 'error');
  const warnings = unique.filter((issue) => issue.severity === 'warning');
  const blockers = unique.filter((issue) => issue.blocking);
  const planStatus = resolvePlanStatus(unique);
  const coverImage = inventory.images.find((image) => image.isCover);

  const planWithoutFingerprint = {
    sourceSystem: DEVELOPMENTS_SOURCE_SYSTEM,
    sourceId: inventory.sourceId,
    entityType: DEVELOPMENT_ENTITY_TYPE,
    internalCode: `${INTERNAL_CODE_PREFIX}${inventory.sourceId}`,
    sortOrder: inventory.ordinal,
    title,
    slug: slugifyTitle(title),
    shortDescription: copy.shortDescription,
    description: copy.description,
    status,
    street,
    streetNumber,
    location: catalogResult.location,
    hasFinancing: financing.hasFinancing,
    financingDescription: financing.financingDescription,
    hasParkingSpaces: parking.hasParkingSpaces,
    parkingSpacesCount: parking.parkingSpacesCount,
    priceFrom: null,
    currency: null,
    matchedFeatures,
    unmatchedFeatures: features.unmatchedFeatures,
    ambiguousFeatures: features.ambiguousFeatures,
    detectedTypologies: detectTypologies(workingText),
    persistTypologies: false as const,
    coverImage: coverImage
      ? {
          ...coverImage,
          altText: title,
        }
      : null,
    gallery: inventory.images.map((image) => ({ ...image, altText: title })),
    catalogGap: catalogResult.catalogGap,
    editorialCorrections,
    warnings,
    errors,
    blockers,
    planStatus,
  };

  const fingerprintSha256 = sha256Json({
    sourceId: planWithoutFingerprint.sourceId,
    title: planWithoutFingerprint.title,
    slug: planWithoutFingerprint.slug,
    shortDescription: planWithoutFingerprint.shortDescription,
    description: planWithoutFingerprint.description,
    status: planWithoutFingerprint.status,
    street: planWithoutFingerprint.street,
    streetNumber: planWithoutFingerprint.streetNumber,
    location: planWithoutFingerprint.location,
    financing: planWithoutFingerprint.financingDescription,
    parking: {
      hasParkingSpaces: planWithoutFingerprint.hasParkingSpaces,
      parkingSpacesCount: planWithoutFingerprint.parkingSpacesCount,
    },
    features: planWithoutFingerprint.matchedFeatures.map(
      (feature) => feature.slug,
    ),
    images: inventory.images.map((image) => ({
      filename: image.filename,
      checksumSha256: image.checksumSha256,
      isCover: image.isCover,
      sortOrder: image.sortOrder,
    })),
    sortOrder: planWithoutFingerprint.sortOrder,
  });

  return {
    ...planWithoutFingerprint,
    fingerprintSha256,
  };
}
