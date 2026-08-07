import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  GALLERY_LIMIT_BLOCKED_WP_IDS,
  HOUZEZ_DATASET_MANIFEST_ID,
  HOUZEZ_SOURCE_SYSTEM,
  MIGRATION_MAX_PROPERTY_IMAGES,
  PILOT_WP_ID,
} from '../constants';
import { extractWordpressDump } from '../wordpress/extract-properties';
import { reconstructOldUrl } from '../wordpress/permalink';
import type {
  AuditReport,
  DatasetManifestReport,
  DryRunReport,
  MigrationSafetyReportSection,
  PlannedEntity,
  StagingPreflightReportSection,
} from '../types';
import { transformPublishProperty } from '../transform/publish-rules';
import { buildGalleryPlan } from '../images/gallery-plan';
import { resolveCatalogsForTransform } from '../catalog/resolve-catalogs';
import {
  checkPropertyIdempotency,
  detectTraceabilitySchema,
} from '../traceability/idempotency';
import { resolveOwner } from './owner-resolution.service';
import { validateDatasetManifest } from '../dataset/validate-dataset-manifest';
import type { MigrationSafetyReport } from '../safety/migration-safety';
import {
  evaluateTraceabilityForMode,
  runStagingPreflight,
  skippedStagingPreflight,
  type PreflightPrisma,
  type StagingPreflightResult,
} from '../preflight/staging-preflight';

export type CliOptions = {
  mode: 'audit' | 'dry-run';
  sourceDir: string;
  reportDir: string;
  tenantSlug: string;
  ownerEmail: string;
  wpId?: number;
  statuses?: string[];
  batchId?: string;
  skipDb?: boolean;
  /** Populated by CLI after staging gates (never includes connection URL). */
  safety?: MigrationSafetyReport;
};

export class DatasetManifestValidationError extends Error {
  constructor(public readonly validation: DatasetManifestReport) {
    super(
      `Dataset manifest validation failed (${validation.manifestId}): ${(validation.errors ?? []).join('; ')}`,
    );
    this.name = 'DatasetManifestValidationError';
  }
}

function createBatchId(explicit?: string): string {
  if (explicit?.trim()) return explicit.trim();
  return `houzez_${new Date().toISOString().replace(/[:.]/g, '-')}_${crypto.randomBytes(4).toString('hex')}`;
}

function toDatasetReport(
  result: Awaited<ReturnType<typeof validateDatasetManifest>>,
): DatasetManifestReport {
  if (result.ok) {
    return {
      manifestId: result.manifestId,
      ok: true,
      datasetId: result.datasetId,
      version: result.version,
      fragmentCount: result.fragmentCount,
      checkedFiles: result.checkedFiles,
    };
  }
  return {
    manifestId: result.manifestId,
    ok: false,
    errors: result.errors,
  };
}

function defaultSafety(options: CliOptions): MigrationSafetyReportSection {
  if (options.safety) {
    return {
      migrationTarget: options.safety.migrationTarget,
      dbHostMasked: options.safety.dbHostMasked,
      gatesSatisfied: options.safety.gatesSatisfied,
      dbAccessEnabled: options.safety.dbAccessEnabled,
      skipDb: options.safety.skipDb,
    };
  }
  if (options.skipDb) {
    return {
      migrationTarget: null,
      dbHostMasked: null,
      gatesSatisfied: false,
      dbAccessEnabled: false,
      skipDb: true,
    };
  }
  return {
    migrationTarget: null,
    dbHostMasked: null,
    gatesSatisfied: false,
    dbAccessEnabled: false,
    skipDb: false,
  };
}

function toPreflightSection(
  result: StagingPreflightResult,
): StagingPreflightReportSection {
  return {
    performed: result.performed,
    propertyTreeEmpty: result.propertyTreeEmpty,
    propertyTreeCounts: result.propertyTreeCounts,
    pilotFeaturePresent: result.pilotFeature.present,
    geoOk:
      result.geo.countryAr &&
      result.geo.provinceCount > 0 &&
      result.geo.localityCount > 0,
    migrationSourceRefExists: result.migrationSourceRef.exists,
    baseline: {
      userCount: result.baseline.userCount,
      developmentCount: result.baseline.developmentCount,
    },
    pilotBlockers: result.pilotBlockers,
    informativeWarnings: result.informativeWarnings,
    importBlockers: result.importBlockers,
  };
}

async function requireValidDataset(
  sourceDir: string,
): Promise<DatasetManifestReport> {
  const validation = toDatasetReport(
    await validateDatasetManifest({ sourceDir }),
  );
  if (!validation.ok) {
    throw new DatasetManifestValidationError(validation);
  }
  return validation;
}

/** Avoid embedding workstation-absolute paths in persisted reports. */
function sanitizeSourceDirForReport(sourceDir: string): string {
  const normalized = sourceDir.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) return '(source-dir)';
  return parts.slice(-2).join('/');
}

function sanitizeImagesForReport(
  images: DryRunReport['images'],
): DryRunReport['images'] {
  return images.map((img) => ({
    ...img,
    absolutePath: null,
  }));
}

export async function runAudit(options: CliOptions): Promise<AuditReport> {
  const datasetManifest = await requireValidDataset(options.sourceDir);
  const dump = await extractWordpressDump(options.sourceDir);
  const byStatus: Record<string, number> = {};
  const taxType: Record<string, number> = {};
  const taxStatus: Record<string, number> = {};
  const taxArea: Record<string, number> = {};
  let multiCommercial = 0;
  const galleryBlocked: Array<{ wpId: number; galleryCount: number }> = [];

  for (const p of dump.properties.values()) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    for (const t of p.taxonomies.property_type ?? []) {
      taxType[t] = (taxType[t] ?? 0) + 1;
    }
    for (const t of p.taxonomies.property_status ?? []) {
      taxStatus[t] = (taxStatus[t] ?? 0) + 1;
    }
    for (const t of p.taxonomies.property_area ?? []) {
      taxArea[t] = (taxArea[t] ?? 0) + 1;
    }
    if ((p.taxonomies.property_status ?? []).length > 1) multiCommercial++;
    if (p.galleryAttachmentIds.length > MIGRATION_MAX_PROPERTY_IMAGES) {
      galleryBlocked.push({
        wpId: p.id,
        galleryCount: p.galleryAttachmentIds.length,
      });
    }
  }

  const report: AuditReport = {
    mode: 'audit',
    sourceDir: sanitizeSourceDirForReport(options.sourceDir),
    datasetManifest,
    dump: {
      tablePrefix: dump.tablePrefix,
      fragmentFiles: [
        'valorar-houzez-001.sql',
        'valorar-houzez-002.sql',
        'valorar-houzez-003.sql',
        'valorar-houzez-004.sql',
        'valorar-houzez-005.sql',
        'valorar-houzez-006.sql',
      ],
      propertyCountByStatus: byStatus,
      attachmentCount: dump.attachments.size,
      postTypes: dump.postTypeCounts,
      propertyTaxonomies: {
        property_type: taxType,
        property_status: taxStatus,
        property_area: taxArea,
      },
      permalink: dump.siteOptions,
      galleryLimitBlocked: galleryBlocked,
      multiCommercialStatusCount: multiCommercial,
      notes: [
        'Read-only audit. No DB writes. No image processing/upload.',
        `Dataset manifest ${HOUZEZ_DATASET_MANIFEST_ID} validated before parse.`,
        `Known product-blocked oversized galleries until MAX raised: ${GALLERY_LIMIT_BLOCKED_WP_IDS.join(', ')}.`,
        `Pilot WP id: ${PILOT_WP_ID}.`,
      ],
    },
    pilotContract: {
      sourceSystem: HOUZEZ_SOURCE_SYSTEM,
      sourceId: String(PILOT_WP_ID),
      propertyType: 'LAND',
      listingType: 'SALE',
      listingStatus: 'ACTIVE',
      price: { amount: 195000, currency: 'USD' },
      totalArea: 202,
      coveredArea: null,
      rooms: null,
      bedrooms: null,
      bathrooms: null,
      halfBathrooms: null,
      parkingSpaces: null,
      images: 7,
      geocode: false,
    },
    galleryLimitPolicy: {
      max: MIGRATION_MAX_PROPERTY_IMAGES,
      behavior: 'explicit_block_no_silent_truncate',
      raiseTo50Before: GALLERY_LIMIT_BLOCKED_WP_IDS,
    },
    wouldWrite: false,
  };

  writeReport(options.reportDir, 'houzez-audit.json', report);
  return report;
}

export async function runDryRun(
  options: CliOptions,
  prisma: object | null,
): Promise<DryRunReport> {
  const wpId = options.wpId ?? PILOT_WP_ID;
  const batchId = createBatchId(options.batchId);
  const safety = defaultSafety(options);
  const warnings: DryRunReport['warnings'] = [];
  const blockers: DryRunReport['blockers'] = [];

  const datasetManifest = await requireValidDataset(options.sourceDir);

  let preflightResult: StagingPreflightResult;
  if (options.skipDb || !prisma) {
    preflightResult = skippedStagingPreflight();
  } else {
    preflightResult = await runStagingPreflight({
      prisma: prisma as PreflightPrisma,
      tenantSlug: options.tenantSlug,
      ownerEmail: options.ownerEmail,
    });
  }
  const preflight = toPreflightSection(preflightResult);
  warnings.push(...preflightResult.informativeWarnings);
  blockers.push(...preflightResult.pilotBlockers);

  const dump = await extractWordpressDump(options.sourceDir);
  const property = dump.properties.get(wpId) ?? null;

  let owner: DryRunReport['owner'] = {
    ok: false,
    errors: ['Database lookup skipped.'],
  };

  if (options.skipDb || !prisma) {
    owner = {
      ok: false,
      errors: [
        'Owner/tenant resolution skipped (--skip-db or no staging DB client). Dry-run cannot validate ownership against staging-houzez.',
      ],
    };
    if (!blockers.some((b) => b.code === 'PREFLIGHT_SKIPPED')) {
      blockers.push({
        code: 'OWNER_UNVALIDATED',
        message: 'Cannot validate tenant/owner without staging DB read access.',
      });
    }
  } else {
    owner = preflightResult.owner.ok
      ? preflightResult.owner
      : await resolveOwner({
          prisma: prisma as never,
          tenantSlug: options.tenantSlug,
          ownerEmail: options.ownerEmail,
        });
    if (!owner.ok) {
      for (const err of owner.errors) {
        if (!blockers.some((b) => b.message === err)) {
          blockers.push({ code: 'OWNER_RESOLUTION', message: err });
        }
      }
    }
  }

  if (!property) {
    blockers.push({
      code: 'PROPERTY_NOT_FOUND',
      message: `WP property id ${wpId} not found in dump.`,
    });
    const schema =
      options.skipDb || !prisma
        ? ({ available: false as const, reason: 'DB skipped.' } as const)
        : await detectTraceabilitySchema(prisma);
    const traceability = evaluateTraceabilityForMode({
      mode: 'dry-run',
      schema,
    });
    warnings.push(...traceability.warnings);

    const empty: DryRunReport = {
      mode: 'dry-run',
      batchId,
      wpId,
      sourceSystem: HOUZEZ_SOURCE_SYSTEM,
      safety,
      datasetManifest,
      preflight,
      owner,
      source: null,
      transformed: null,
      inferences: [],
      catalogs: [],
      images: [],
      imageSummary: null,
      oldUrl: {
        status: 'unavailable',
        oldSlug: null,
        postDate: null,
        oldUrl: null,
        components: {},
        notes: ['Property missing.'],
      },
      plannedEntities: [],
      idempotency: {
        schema,
        existingPropertyRef: null,
        note: 'n/a',
        idempotencySchemaAvailable: traceability.idempotencySchemaAvailable,
        idempotencyDbCheckPerformed: false,
      },
      warnings,
      blockers,
      wouldWrite: false,
    };
    writeReport(options.reportDir, `houzez-dry-run-${wpId}.json`, empty);
    return empty;
  }

  if (options.statuses?.length && !options.statuses.includes(property.status)) {
    blockers.push({
      code: 'STATUS_FILTER',
      message: `Property status "${property.status}" not in allowed statuses [${options.statuses.join(', ')}].`,
    });
  }

  const transform = transformPublishProperty(property);
  warnings.push(...transform.warnings.map((w) => ({ ...w, wpId })));
  blockers.push(...transform.blockers.map((b) => ({ ...b, wpId })));

  const uploadsDir = path.join(options.sourceDir, 'uploads');
  const gallery = buildGalleryPlan({
    property,
    attachments: dump.attachments,
    uploadsDir,
    tenantIdPlaceholder: owner.tenantId ?? '{tenantId}',
    computeHash: true,
  });
  warnings.push(...gallery.warnings.map((w) => ({ ...w, wpId })));
  blockers.push(...gallery.blockers.map((b) => ({ ...b, wpId })));

  const catalogs = await resolveCatalogsForTransform({
    prisma: options.skipDb || !prisma ? null : (prisma as never),
    transform,
  });
  for (const cat of catalogs) {
    if (cat.key.startsWith('feature:') && cat.status === 'omitted') {
      warnings.push({
        code: 'FEATURE_OMITTED',
        message: `${cat.key}: ${cat.detail}`,
        wpId,
      });
    }
  }
  const oldUrl = reconstructOldUrl({
    site: dump.siteOptions,
    slug: property.slug,
    postDate: property.postDate,
  });

  const schema =
    options.skipDb || !prisma
      ? {
          available: false as const,
          reason: 'DB skipped.',
        }
      : await detectTraceabilitySchema(prisma);

  const traceability = evaluateTraceabilityForMode({
    mode: 'dry-run',
    schema,
  });
  for (const w of traceability.warnings) {
    if (!warnings.some((x) => x.code === w.code)) warnings.push(w);
  }

  const idempotency = owner.tenantId
    ? await checkPropertyIdempotency({
        prisma: prisma ?? {},
        schema,
        tenantId: owner.tenantId,
        sourceId: String(wpId),
      })
    : {
        schema,
        existingPropertyRef: null,
        note: 'Tenant unresolved — idempotency DB check incomplete.',
        idempotencySchemaAvailable: traceability.idempotencySchemaAvailable,
        idempotencyDbCheckPerformed: false,
      };

  if (idempotency.existingPropertyRef) {
    warnings.push({
      code: 'IDEMPOTENT_HIT',
      message: `Source ref already exists for property entityId=${idempotency.existingPropertyRef.entityId} batch=${idempotency.existingPropertyRef.migrationBatchId}`,
      wpId,
    });
  }

  const plannedEntities: PlannedEntity[] = [];
  if (blockers.length === 0) {
    plannedEntities.push({
      entityType: 'property',
      provisionalKey: `property:${wpId}`,
      sourceId: String(wpId),
      payload: {
        ...transform.property,
        createdById: owner.userId,
        assignedToId: owner.userId,
        tenantId: owner.tenantId,
      },
    });
    plannedEntities.push({
      entityType: 'property_listing',
      provisionalKey: `listing:${wpId}:SALE`,
      sourceId: String(wpId),
      payload: transform.listing,
    });
    if (transform.price) {
      plannedEntities.push({
        entityType: 'property_price',
        provisionalKey: `price:${wpId}:primary`,
        sourceId: String(wpId),
        payload: transform.price,
      });
    }
    for (const image of gallery.images) {
      plannedEntities.push({
        entityType: 'property_image',
        provisionalKey: `image:${wpId}:${image.attachmentId}`,
        sourceId: String(image.attachmentId),
        payload: {
          sortOrder: image.sortOrder,
          isCover: image.isCover,
          proposedFilename: image.proposedFilename,
          sha256: image.sha256,
        },
      });
    }
    for (const cat of catalogs) {
      if (cat.key.startsWith('feature:') && cat.status === 'resolved') {
        plannedEntities.push({
          entityType: 'property_feature_assignment',
          provisionalKey: `feature:${wpId}:${cat.key}`,
          sourceId: String(wpId),
          payload: cat.value as Record<string, unknown>,
        });
      }
    }
    plannedEntities.push({
      entityType: 'batch_manifest',
      provisionalKey: `batch:${batchId}`,
      sourceId: batchId,
      payload: {
        wpId,
        oldUrl,
        inferences: transform.inferences,
      },
    });
  }

  const report: DryRunReport = {
    mode: 'dry-run',
    batchId,
    wpId,
    sourceSystem: HOUZEZ_SOURCE_SYSTEM,
    safety,
    datasetManifest,
    preflight,
    owner,
    source: property,
    transformed: {
      property: transform.property,
      listing: transform.listing,
      price: transform.price,
      featureNames: transform.featureNames,
    },
    inferences: transform.inferences,
    catalogs,
    images: sanitizeImagesForReport(gallery.images),
    imageSummary: {
      galleryCount: gallery.galleryCount,
      uniqueCount: gallery.uniqueCount,
      coverAttachmentId: gallery.coverAttachmentId,
      coverInGallery: gallery.coverInGallery,
      coverPrepended: gallery.coverPrepended,
      allOriginalsExist: gallery.allOriginalsExist,
      exceedsImageLimit: gallery.exceedsImageLimit,
      imageLimit: gallery.imageLimit,
    },
    oldUrl,
    plannedEntities,
    idempotency,
    warnings,
    blockers,
    wouldWrite: false,
  };

  writeReport(options.reportDir, `houzez-dry-run-${wpId}.json`, report);
  return report;
}

function writeReport(reportDir: string, filename: string, data: unknown) {
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, filename),
    JSON.stringify(data, null, 2),
    'utf8',
  );
}
