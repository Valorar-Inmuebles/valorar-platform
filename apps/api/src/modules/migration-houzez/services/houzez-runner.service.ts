import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  GALLERY_LIMIT_BLOCKED_WP_IDS,
  HOUZEZ_DATASET_MANIFEST_ID,
  HOUZEZ_SOURCE_SYSTEM,
  MIGRATION_MAX_PROPERTY_IMAGES,
  PILOT_WP_ID,
  PRODUCTION_MIGRATION_TARGET,
  confirmWriteForTarget,
  isHouzezMigrationTarget,
} from '../constants';
import { extractWordpressDump } from '../wordpress/extract-properties';
import { reconstructOldUrl } from '../wordpress/permalink';
import type {
  AuditReport,
  DatasetManifestReport,
  DryRunReport,
  MigrationSafetyReportSection,
  StagingPreflightReportSection,
} from '../types';
import { transformPublishProperty } from '../transform/publish-rules';
import { buildGalleryPlan } from '../images/gallery-plan';
import { resolveCatalogsForTransform } from '../catalog/resolve-catalogs';
import {
  catalogsIncludeExactFlores,
  resolveExactFloresLocality,
} from '../catalog/assert-flores-locality';
import {
  checkPropertyIdempotency,
  detectTraceabilitySchema,
} from '../traceability/idempotency';
import { resolveOwner } from './owner-resolution.service';
import { validateDatasetManifest } from '../dataset/validate-dataset-manifest';
import type { MigrationSafetyReport } from '../safety/migration-safety';
import { assertProductionNeonIdentity } from '../safety/neon-identity';
import {
  evaluateTraceabilityForMode,
  runStagingPreflight,
  skippedStagingPreflight,
  type PreflightPrisma,
  type StagingPreflightResult,
} from '../preflight/staging-preflight';
import {
  assertLiveFingerprintMatchesApprovedReport,
  buildPlannedEntitiesForPlan,
  computeDryRunFingerprint,
} from '../writer/dry-run-fingerprint';
import { validateDryRunReportForImport } from '../writer/validate-dry-run-report';
import type { MigrationObjectStore } from '../writer/migration-object-store';
import { validatePilotPreexistingR2Objects } from '../writer/preexisting-r2';
import {
  writeOneHouzezProperty,
  type ImportReport,
  type WriterPrisma,
} from '../writer/houzez-property-writer';

export type CliOptions = {
  mode: 'audit' | 'dry-run' | 'import';
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
  /** Absolute or relative path to an approved dry-run JSON report (import only). */
  dryRunReportPath?: string;
  confirmTarget?: string;
  confirmWrite?: string;
};

export type ImportCliOptions = CliOptions & {
  mode: 'import';
  wpId: number;
  dryRunReportPath: string;
  confirmTarget: string;
  confirmWrite: string;
};

export class DatasetManifestValidationError extends Error {
  constructor(public readonly validation: DatasetManifestReport) {
    super(
      `Dataset manifest validation failed (${validation.manifestId}): ${(validation.errors ?? []).join('; ')}`,
    );
    this.name = 'DatasetManifestValidationError';
  }
}

export class ImportValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(`Import validation failed: ${errors.join('; ')}`);
    this.name = 'ImportValidationError';
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
      fragmentDigests: result.fragmentDigests,
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
      neonIdentityVerified: options.safety.neonIdentityVerified ?? null,
    };
  }
  if (options.skipDb) {
    return {
      migrationTarget: null,
      dbHostMasked: null,
      gatesSatisfied: false,
      dbAccessEnabled: false,
      skipDb: true,
      neonIdentityVerified: null,
    };
  }
  return {
    migrationTarget: null,
    dbHostMasked: null,
    gatesSatisfied: false,
    dbAccessEnabled: false,
    skipDb: false,
    neonIdentityVerified: null,
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

  if (
    !options.skipDb &&
    prisma &&
    safety.migrationTarget === PRODUCTION_MIGRATION_TARGET
  ) {
    const neon = await assertProductionNeonIdentity(
      prisma as {
        $queryRawUnsafe: (q: string) => Promise<unknown>;
      },
    );
    if (!neon.ok) {
      for (const message of neon.errors) {
        blockers.push({ code: 'PRODUCTION_NEON_IDENTITY', message });
      }
    } else {
      safety.neonIdentityVerified = true;
    }

    const flores = await resolveExactFloresLocality(prisma as never);
    if (!flores.ok) {
      for (const message of flores.errors) {
        blockers.push({ code: 'FLORES_LOCALITY', message });
      }
    }
  }

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

    const emptyBase: Omit<DryRunReport, 'reportFingerprint'> = {
      mode: 'dry-run',
      batchId,
      wpId,
      sourceSystem: HOUZEZ_SOURCE_SYSTEM,
      tenantSlug: options.tenantSlug,
      ownerEmail: options.ownerEmail,
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
    const empty: DryRunReport = {
      ...emptyBase,
      reportFingerprint: computeDryRunFingerprint({
        ...emptyBase,
        reportFingerprint: '',
      }),
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

  const plannedEntities = buildPlannedEntitiesForPlan({
    wpId,
    batchId,
    owner,
    transform,
    catalogs,
    images: gallery.images,
    oldUrl,
    blockersEmpty: blockers.length === 0,
  });

  const reportBase: Omit<DryRunReport, 'reportFingerprint'> = {
    mode: 'dry-run',
    batchId,
    wpId,
    sourceSystem: HOUZEZ_SOURCE_SYSTEM,
    tenantSlug: options.tenantSlug,
    ownerEmail: options.ownerEmail,
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
  const report: DryRunReport = {
    ...reportBase,
    reportFingerprint: computeDryRunFingerprint({
      ...reportBase,
      reportFingerprint: '',
    }),
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

function loadDryRunReportFile(reportPath: string): DryRunReport {
  if (!fs.existsSync(reportPath) || !fs.statSync(reportPath).isFile()) {
    throw new ImportValidationError([
      `Dry-run report not found at --dry-run-report path (missing or not a file).`,
    ]);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch {
    throw new ImportValidationError(['Dry-run report is not valid JSON.']);
  }
  return parsed as DryRunReport;
}

/**
 * Import exactly one Houzez property.
 * Requires approved dry-run report + dual confirmations + staging safety gates.
 * Never uses DATABASE_URL. Never imports more than one WP id.
 */
export async function runImport(
  options: ImportCliOptions,
  prisma: WriterPrisma,
  objectStore: MigrationObjectStore,
): Promise<ImportReport> {
  if (!options.wpId || !Number.isFinite(options.wpId)) {
    throw new ImportValidationError([
      'Import requires an explicit --wp-id (no default).',
    ]);
  }
  if (options.skipDb) {
    throw new ImportValidationError([
      'Import refuses --skip-db (DB access is mandatory).',
    ]);
  }
  if (!options.safety?.gatesSatisfied || !options.safety.dbAccessEnabled) {
    throw new ImportValidationError([
      'Import refuses to proceed without satisfied migration safety gates.',
    ]);
  }

  const migrationTarget = options.safety.migrationTarget;
  if (!migrationTarget || !isHouzezMigrationTarget(migrationTarget)) {
    throw new ImportValidationError([
      'Import requires a valid safety.migrationTarget (staging-houzez | production).',
    ]);
  }
  if (options.confirmTarget !== migrationTarget) {
    throw new ImportValidationError([
      `--confirm-target=${options.confirmTarget} does not match HOUZEZ_MIGRATION_TARGET/safety target ${migrationTarget}.`,
    ]);
  }
  if (options.confirmWrite !== confirmWriteForTarget(migrationTarget)) {
    throw new ImportValidationError([
      `--confirm-write does not match the required token for target ${migrationTarget}.`,
    ]);
  }

  if (migrationTarget === PRODUCTION_MIGRATION_TARGET) {
    const neon = await assertProductionNeonIdentity(
      prisma as unknown as {
        $queryRawUnsafe: (q: string) => Promise<unknown>;
      },
    );
    if (!neon.ok) {
      throw new ImportValidationError(neon.errors);
    }
  }

  const datasetManifest = await requireValidDataset(options.sourceDir);
  const dryRunReport = loadDryRunReportFile(options.dryRunReportPath);
  const bound = validateDryRunReportForImport({
    report: dryRunReport,
    wpId: options.wpId,
    tenantSlug: options.tenantSlug,
    ownerEmail: options.ownerEmail,
    migrationTarget,
  });
  if (!bound.ok) {
    throw new ImportValidationError(bound.errors);
  }

  if (
    bound.report.datasetManifest.manifestId !== datasetManifest.manifestId ||
    !datasetManifest.ok
  ) {
    throw new ImportValidationError([
      'Live dataset manifest does not match the approved dry-run report manifest.',
    ]);
  }
  const liveDigests = datasetManifest.fragmentDigests ?? [];
  const reportDigests = bound.report.datasetManifest.fragmentDigests ?? [];
  for (const live of liveDigests) {
    const match = reportDigests.find((d) => d.fileName === live.fileName);
    if (
      !match ||
      match.sha256.toLowerCase() !== live.sha256.toLowerCase() ||
      match.bytes !== live.bytes
    ) {
      throw new ImportValidationError([
        `Manifest fragment digest mismatch vs dry-run report for ${live.fileName}.`,
      ]);
    }
  }

  const preflightResult = await runStagingPreflight({
    prisma: prisma as unknown as PreflightPrisma,
    tenantSlug: options.tenantSlug,
    ownerEmail: options.ownerEmail,
  });
  if (preflightResult.pilotBlockers.length) {
    throw new ImportValidationError(
      preflightResult.pilotBlockers.map((b) => `${b.code}: ${b.message}`),
    );
  }
  if (preflightResult.importBlockers.length) {
    throw new ImportValidationError(
      preflightResult.importBlockers.map((b) => `${b.code}: ${b.message}`),
    );
  }
  if (!preflightResult.propertyTreeEmpty) {
    throw new ImportValidationError([
      'Property tree baseline is not empty — refusing import.',
    ]);
  }
  if (!preflightResult.migrationSourceRef.exists) {
    throw new ImportValidationError([
      'IDEMPOTENCY_SCHEMA_REQUIRED_FOR_IMPORT: MigrationSourceRef table missing.',
    ]);
  }

  const owner = preflightResult.owner.ok
    ? preflightResult.owner
    : await resolveOwner({
        prisma: prisma as never,
        tenantSlug: options.tenantSlug,
        ownerEmail: options.ownerEmail,
      });
  if (!owner.ok) {
    throw new ImportValidationError(owner.errors);
  }

  const dump = await extractWordpressDump(options.sourceDir);
  const property = dump.properties.get(options.wpId);
  if (!property) {
    throw new ImportValidationError([
      `WP property id ${options.wpId} not found in dump.`,
    ]);
  }
  if (options.statuses?.length && !options.statuses.includes(property.status)) {
    throw new ImportValidationError([
      `Property status "${property.status}" not in allowed statuses.`,
    ]);
  }

  const transform = transformPublishProperty(property);
  if (transform.blockers.length) {
    throw new ImportValidationError(
      transform.blockers.map((b) => `${b.code}: ${b.message}`),
    );
  }

  const uploadsDir = path.join(options.sourceDir, 'uploads');
  const gallery = buildGalleryPlan({
    property,
    attachments: dump.attachments,
    uploadsDir,
    tenantIdPlaceholder: owner.tenantId ?? '{tenantId}',
    computeHash: true,
  });
  if (gallery.blockers.length) {
    throw new ImportValidationError(
      gallery.blockers.map((b) => `${b.code}: ${b.message}`),
    );
  }

  const catalogs = await resolveCatalogsForTransform({
    prisma: prisma as never,
    transform,
  });

  if (migrationTarget === PRODUCTION_MIGRATION_TARGET) {
    const flores = await resolveExactFloresLocality(prisma as never);
    if (!flores.ok) {
      throw new ImportValidationError(flores.errors);
    }
    if (!catalogsIncludeExactFlores(catalogs, flores.locality.id)) {
      throw new ImportValidationError([
        `Catalog localityId must resolve exactly to Flores under Capital Federal (id=${flores.locality.id}, slug=flores).`,
      ]);
    }

    const r2Check = await validatePilotPreexistingR2Objects({
      objectStore,
      tenantId: owner.tenantId!,
      sourceId: String(options.wpId),
      images: gallery.images,
    });
    if (!r2Check.ok) {
      throw new ImportValidationError(r2Check.errors);
    }
  }

  const oldUrl = reconstructOldUrl({
    site: dump.siteOptions,
    slug: property.slug,
    postDate: property.postDate,
  });

  const liveFingerprintCheck = assertLiveFingerprintMatchesApprovedReport({
    approvedFingerprint: bound.fingerprint,
    live: {
      wpId: options.wpId,
      sourceSystem: HOUZEZ_SOURCE_SYSTEM,
      tenantSlug: options.tenantSlug,
      ownerEmail: options.ownerEmail,
      migrationTarget,
      batchId: bound.report.batchId,
      owner,
      transform,
      catalogs,
      images: gallery.images,
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
      datasetManifest: bound.report.datasetManifest,
      blockers: [],
      pilotBlockers: [],
    },
  });
  if (!liveFingerprintCheck.ok) {
    throw new ImportValidationError(liveFingerprintCheck.errors);
  }

  const batchId = createBatchId(options.batchId);
  const importReport = await writeOneHouzezProperty({
    prisma,
    objectStore,
    dryRun: bound.report,
    transform,
    catalogs,
    images: gallery.images,
    owner,
    batchId,
    fingerprint: bound.fingerprint,
  });

  writeReport(
    options.reportDir,
    `houzez-import-${options.wpId}.json`,
    sanitizeImportReportForPersist(importReport),
  );
  return importReport;
}

/** Strip absolute paths if any leaked into notes/errors before disk persist. */
function sanitizeImportReportForPersist(report: ImportReport): ImportReport {
  const scrub = (s: string) =>
    s
      .replace(/[A-Za-z]:\\[^\s"']+/g, '[path]')
      .replace(/\/(?:home|Users|cursor)\/[^\s"']+/g, '[path]');
  return {
    ...report,
    error: report.error,
    notes: report.notes.map(scrub),
    blockers: report.blockers.map((b) => ({
      ...b,
      message: scrub(b.message),
    })),
    warnings: report.warnings.map((w) => ({
      ...w,
      message: scrub(w.message),
    })),
    compensation: {
      ...report.compensation,
      compensationErrors: report.compensation.compensationErrors.map(scrub),
    },
  };
}
