import * as crypto from 'node:crypto';
import {
  HOUZEZ_SOURCE_SYSTEM,
  MIGRATION_ENTITY_TYPE_PROPERTY,
} from '../constants';
import type {
  BlockerRecord,
  CatalogResolution,
  DryRunReport,
  ImagePlanEntry,
  OwnerResolution,
  WarningRecord,
} from '../types';
import type { PublishTransformResult } from '../transform/publish-rules';
import {
  checkPropertyIdempotency,
  detectTraceabilitySchema,
} from '../traceability/idempotency';
import type { MigrationObjectStore } from './migration-object-store';
import { buildHouzezMigrationImageKey } from './storage-keys';
import {
  IMAGE_OPTIMIZE_PARAMS,
  applyImageOptimizationPlan,
  assertOptimizedPlanMatchesApproved,
} from '../images/optimize-pipeline';

export type WriterCreatedIds = {
  propertyId: string;
  listingId: string;
  priceId: string | null;
  imageIds: string[];
  featureAssignmentIds: string[];
  agentAccessId: string;
  migrationSourceRefId: string;
};

export type ImportCompensationReport = {
  uploadedKeys: string[];
  compensatedKeys: string[];
  pendingKeys: string[];
  compensationFailed: boolean;
  compensationErrors: string[];
};

export type ImportReport = {
  mode: 'import';
  wpId: number;
  sourceSystem: string;
  batchId: string;
  tenantSlug: string;
  ownerEmail: string;
  dryRunFingerprint: string;
  wouldWrite: true;
  wrote: boolean;
  propertyId: string | null;
  created: WriterCreatedIds | null;
  domainEntityCount: number;
  controlEntityCount: number;
  /** Domain entities persisted (excludes MigrationSourceRef control row). */
  persistedDomain: Array<{ entityType: string; id: string }>;
  compensation: ImportCompensationReport;
  warnings: WarningRecord[];
  blockers: BlockerRecord[];
  error: string | null;
  /** Sanitized — never includes connection strings or absolute workstation paths. */
  notes: string[];
};

export type WriterPrismaTx = {
  property: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  propertyListing: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  propertyPrice: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  propertyImage: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  propertyFeatureAssignment: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  propertyAgentAccess: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  migrationSourceRef: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
};

export type WriterPrisma = {
  $transaction: <T>(fn: (tx: WriterPrismaTx) => Promise<T>) => Promise<T>;
  migrationSourceRef: {
    findUnique: (args: unknown) => Promise<{
      entityId: string;
      migrationBatchId: string;
      entityType: string;
      metadata: unknown;
    } | null>;
    findMany?: (args: unknown) => Promise<
      Array<{
        entityId: string;
        entityType: string;
        sourceId: string;
        migrationBatchId: string;
        metadata: unknown;
        updatedAt: Date;
        createdAt: Date;
      }>
    >;
    create?: (args: unknown) => Promise<{ id: string }>;
  };
  $queryRawUnsafe?: (q: string) => Promise<unknown>;
};

export type PreparedUpload = {
  key: string;
  /** Optimized WebP bytes ready for PutObject (never original JPEG/PNG). */
  body: Buffer;
  contentType: string;
  sortOrder: number;
  attachmentId: number;
  isCover: boolean;
  altText: string | null;
  fileSize: number | null;
  mimeType: string | null;
  sha256: string;
  sourceSha256: string | null;
};

export class HouzezImportError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'HouzezImportError';
  }
}

export class UploadStageError extends Error {
  constructor(
    message: string,
    public readonly uploadedKeys: string[],
  ) {
    super(message);
    this.name = 'UploadStageError';
  }
}

function newId(): string {
  return `c${crypto.randomBytes(12).toString('hex')}`;
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  if (code === 'P2002') return true;
  const message = String((error as { message?: string }).message ?? '');
  return /unique constraint|MigrationSourceRef_tenantId_sourceSystem/i.test(
    message,
  );
}

function catalogValueId(
  catalogs: CatalogResolution[],
  key: string,
): string | null {
  const hit = catalogs.find((c) => c.key === key && c.status === 'resolved');
  if (!hit || hit.value == null) return null;
  if (
    typeof hit.value === 'object' &&
    hit.value !== null &&
    'id' in hit.value
  ) {
    return String((hit.value as { id: string }).id);
  }
  return null;
}

function resolvedFeatureIds(catalogs: CatalogResolution[]): string[] {
  const ids: string[] = [];
  for (const cat of catalogs) {
    if (!cat.key.startsWith('feature:') || cat.status !== 'resolved') continue;
    if (cat.value && typeof cat.value === 'object' && 'id' in cat.value) {
      ids.push(String((cat.value as { id: string }).id));
    }
  }
  return ids;
}

export async function prepareImageUploads(input: {
  images: ImagePlanEntry[];
  tenantId: string;
  sourceId: string;
  /**
   * When provided (import), re-optimize live sources and require an exact match
   * against the approved dry-run plan before any PutObject.
   */
  approvedImages?: ImagePlanEntry[];
  /** Optional precomputed optimized bodies keyed by attachmentId (local prep reuse). */
  optimizedBodies?: Map<number, Buffer>;
}): Promise<{ uploads: PreparedUpload[]; images: ImagePlanEntry[] }> {
  const { images: optimizedImages, optimizedBodies } =
    input.optimizedBodies && input.images.every((i) => i.optimization)
      ? {
          images: input.images,
          optimizedBodies: input.optimizedBodies,
        }
      : await applyImageOptimizationPlan({
          images: input.images,
          tenantId: input.tenantId,
          sourceId: input.sourceId,
        });

  if (input.approvedImages) {
    const match = assertOptimizedPlanMatchesApproved({
      live: optimizedImages,
      approved: input.approvedImages,
    });
    if (!match.ok) {
      throw new HouzezImportError(
        match.errors.join(' '),
        'IMAGE_OPTIMIZE_PLAN_MISMATCH',
        { errors: match.errors },
      );
    }
  }

  const prepared: PreparedUpload[] = [];
  for (const image of optimizedImages) {
    const body = optimizedBodies.get(image.attachmentId);
    if (!body || !image.sha256 || !image.optimization) {
      throw new HouzezImportError(
        `Optimized bytes missing for attachment ${image.attachmentId}.`,
        'IMAGE_OPTIMIZE_BYTES_MISSING',
      );
    }
    if (image.mimeType !== IMAGE_OPTIMIZE_PARAMS.contentType) {
      throw new HouzezImportError(
        `Refusing non-WebP optimized mime for attachment ${image.attachmentId}.`,
        'IMAGE_OUTPUT_MIME_MISMATCH',
      );
    }
    const key =
      image.optimization.output.storageKey ||
      buildHouzezMigrationImageKey({
        tenantId: input.tenantId,
        sourceId: input.sourceId,
        sortOrder: image.sortOrder,
        attachmentId: image.attachmentId,
        extension: IMAGE_OPTIMIZE_PARAMS.extension,
      });
    if (!key.endsWith('.webp')) {
      throw new HouzezImportError(
        `Storage key must end with .webp (got ${key}).`,
        'IMAGE_STORAGE_KEY_EXTENSION',
      );
    }
    prepared.push({
      key,
      body,
      contentType: IMAGE_OPTIMIZE_PARAMS.contentType,
      sortOrder: image.sortOrder,
      attachmentId: image.attachmentId,
      isCover: image.isCover,
      altText: null,
      fileSize: image.fileSizeBytes,
      mimeType: IMAGE_OPTIMIZE_PARAMS.contentType,
      sha256: image.sha256,
      sourceSha256: image.sourceSha256 ?? null,
    });
  }
  return { uploads: prepared, images: optimizedImages };
}

export async function uploadPreparedImages(input: {
  uploads: PreparedUpload[];
  objectStore: MigrationObjectStore;
}): Promise<{ uploadedKeys: string[]; skippedPreexistingKeys: string[] }> {
  const uploadedKeys: string[] = [];
  const skippedPreexistingKeys: string[] = [];

  try {
    for (const upload of input.uploads) {
      if (!upload.body?.length) {
        throw new Error(
          `Refusing empty upload body for key=${upload.key} attachment=${upload.attachmentId}.`,
        );
      }
      if (upload.contentType !== IMAGE_OPTIMIZE_PARAMS.contentType) {
        throw new Error(`Refusing non-WebP contentType for key=${upload.key}.`);
      }
      const result = await input.objectStore.putObject({
        key: upload.key,
        body: upload.body,
        contentType: upload.contentType,
      });
      if (result.wrote) {
        uploadedKeys.push(upload.key);
      } else if (result.preexisting) {
        skippedPreexistingKeys.push(upload.key);
      }
    }
  } catch (error) {
    throw new UploadStageError(
      error instanceof Error ? error.message : String(error),
      uploadedKeys,
    );
  }

  return { uploadedKeys, skippedPreexistingKeys };
}

export async function compensateUploadedKeys(input: {
  objectStore: MigrationObjectStore;
  uploadedKeys: string[];
}): Promise<ImportCompensationReport> {
  const compensatedKeys: string[] = [];
  const pendingKeys: string[] = [];
  const compensationErrors: string[] = [];

  for (const key of input.uploadedKeys) {
    try {
      await input.objectStore.deleteObject(key);
      compensatedKeys.push(key);
    } catch (error) {
      pendingKeys.push(key);
      compensationErrors.push(
        `Failed to delete key=${key}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    uploadedKeys: [...input.uploadedKeys],
    compensatedKeys,
    pendingKeys,
    compensationFailed: pendingKeys.length > 0,
    compensationErrors,
  };
}

/**
 * Persist one Houzez property using an already-validated dry-run plan.
 * Uploads happen before the DB transaction; DB failure triggers compensation
 * of keys written by THIS execution only (never preexisting keys).
 */
export async function writeOneHouzezProperty(input: {
  prisma: WriterPrisma;
  objectStore: MigrationObjectStore;
  dryRun: DryRunReport;
  transform: PublishTransformResult;
  catalogs: CatalogResolution[];
  images: ImagePlanEntry[];
  owner: OwnerResolution;
  batchId: string;
  fingerprint: string;
}): Promise<ImportReport> {
  const wpId = input.dryRun.wpId;
  const warnings: WarningRecord[] = [];
  const notes: string[] = [
    'Import writes exactly one property (--wp-id required).',
    'plannedEntities dry-run count includes batch_manifest (planning artifact), not PropertyAgentAccess.',
    'Writer persists PropertyAgentAccess + MigrationSourceRef in addition to planned domain entities.',
  ];

  const baseReport = (): ImportReport => ({
    mode: 'import',
    wpId,
    sourceSystem: HOUZEZ_SOURCE_SYSTEM,
    batchId: input.batchId,
    tenantSlug: input.dryRun.tenantSlug,
    ownerEmail: input.dryRun.ownerEmail,
    dryRunFingerprint: input.fingerprint,
    wouldWrite: true,
    wrote: false,
    propertyId: null,
    created: null,
    domainEntityCount: 0,
    controlEntityCount: 0,
    persistedDomain: [],
    compensation: {
      uploadedKeys: [],
      compensatedKeys: [],
      pendingKeys: [],
      compensationFailed: false,
      compensationErrors: [],
    },
    warnings,
    blockers: [],
    error: null,
    notes,
  });

  if (!input.owner.ok || !input.owner.tenantId || !input.owner.userId) {
    const report = baseReport();
    report.blockers.push({
      code: 'OWNER_RESOLUTION',
      message: 'Owner/tenant unresolved — refusing import.',
    });
    report.error = 'OWNER_RESOLUTION';
    return report;
  }

  const schema = await detectTraceabilitySchema(input.prisma);
  if (!schema.available) {
    const report = baseReport();
    report.blockers.push({
      code: 'IDEMPOTENCY_SCHEMA_REQUIRED_FOR_IMPORT',
      message:
        'reason' in schema
          ? schema.reason
          : 'MigrationSourceRef schema unavailable.',
    });
    report.error = 'IDEMPOTENCY_SCHEMA_REQUIRED_FOR_IMPORT';
    return report;
  }

  const idempotency = await checkPropertyIdempotency({
    prisma: input.prisma as never,
    schema,
    tenantId: input.owner.tenantId,
    sourceId: String(wpId),
  });
  if (idempotency.existingPropertyRef) {
    const report = baseReport();
    report.blockers.push({
      code: 'SOURCE_ALREADY_IMPORTED',
      message: `Origin already imported as property entityId=${idempotency.existingPropertyRef.entityId}.`,
    });
    report.error = 'SOURCE_ALREADY_IMPORTED';
    return report;
  }

  let prepared: PreparedUpload[];
  try {
    const preparedResult = await prepareImageUploads({
      images: input.images,
      tenantId: input.owner.tenantId,
      sourceId: String(wpId),
      approvedImages: input.dryRun.images,
    });
    prepared = preparedResult.uploads;
  } catch (error) {
    const report = baseReport();
    report.blockers.push({
      code:
        error instanceof HouzezImportError
          ? error.code
          : 'IMAGE_PREPARE_FAILED',
      message: error instanceof Error ? error.message : String(error),
    });
    report.error = 'IMAGE_PREPARE_FAILED';
    return report;
  }

  let uploadedKeys: string[] = [];
  let skippedPreexistingKeys: string[] = [];
  try {
    const uploadResult = await uploadPreparedImages({
      uploads: prepared,
      objectStore: input.objectStore,
    });
    uploadedKeys = uploadResult.uploadedKeys;
    skippedPreexistingKeys = uploadResult.skippedPreexistingKeys;
    if (skippedPreexistingKeys.length) {
      warnings.push({
        code: 'R2_PREEXISTING_KEYS_REUSED',
        message: `Reused ${skippedPreexistingKeys.length} preexisting object key(s) without rewriting; they will not be deleted on compensation.`,
        wpId,
      });
    }
  } catch (error) {
    const keysToCompensate =
      error instanceof UploadStageError ? error.uploadedKeys : uploadedKeys;
    const compensation = await compensateUploadedKeys({
      objectStore: input.objectStore,
      uploadedKeys: keysToCompensate,
    });
    const report = baseReport();
    report.compensation = compensation;
    report.blockers.push({
      code: 'UPLOAD_FAILED',
      message: error instanceof Error ? error.message : String(error),
    });
    report.error = 'UPLOAD_FAILED';
    if (compensation.compensationFailed) {
      report.blockers.push({
        code: 'COMPENSATION_FAILED',
        message: `Upload compensation incomplete; pendingKeys=${compensation.pendingKeys.length}.`,
      });
      report.error = 'COMPENSATION_FAILED_AFTER_UPLOAD';
    }
    return report;
  }

  const tenantId = input.owner.tenantId;
  const userId = input.owner.userId;
  const propertyId = newId();
  const listingId = newId();
  const priceId = input.transform.price ? newId() : null;
  const featureIds = resolvedFeatureIds(input.catalogs);
  const featureAssignmentIds = featureIds.map(() => newId());
  const imageIds = prepared.map(() => newId());
  const agentAccessId = newId();
  const migrationSourceRefId = newId();

  const countryId = catalogValueId(input.catalogs, 'countryId');
  const provinceId = catalogValueId(input.catalogs, 'provinceId');
  const localityId = catalogValueId(input.catalogs, 'localityId');

  try {
    await input.prisma.$transaction(async (tx) => {
      await tx.property.create({
        data: {
          id: propertyId,
          tenantId,
          createdById: userId,
          assignedToId: userId,
          slug: input.transform.property.slug,
          internalCode: input.transform.property.internalCode,
          title: input.transform.property.title,
          description: input.transform.property.description,
          propertyType: input.transform.property.propertyType,
          isActive: true,
          street: input.transform.property.street,
          streetNumber: input.transform.property.streetNumber,
          neighborhood: input.transform.property.neighborhood,
          city: input.transform.property.city,
          province: input.transform.property.province,
          country: input.transform.property.country,
          countryId,
          provinceId,
          localityId,
          latitude: input.transform.property.latitude,
          longitude: input.transform.property.longitude,
          geocodeSource: input.transform.property.geocodeSource,
          totalArea: input.transform.property.totalArea,
          coveredArea: input.transform.property.coveredArea,
          rooms: input.transform.property.rooms,
          bedrooms: input.transform.property.bedrooms,
          bathrooms: input.transform.property.bathrooms,
          halfBathrooms: input.transform.property.halfBathrooms,
          parkingSpaces: input.transform.property.parkingSpaces,
        },
      });

      await tx.propertyListing.create({
        data: {
          id: listingId,
          tenantId,
          propertyId,
          listingType: input.transform.listing.listingType,
          status: input.transform.listing.status,
          publishedAt:
            input.transform.listing.status === 'ACTIVE' ||
            input.transform.listing.status === 'RESERVED'
              ? new Date()
              : null,
        },
      });

      if (input.transform.price && priceId) {
        await tx.propertyPrice.create({
          data: {
            id: priceId,
            tenantId,
            listingId,
            amount: input.transform.price.amount,
            currency: input.transform.price.currency,
            isPrimary: true,
          },
        });
      }

      for (let i = 0; i < prepared.length; i++) {
        const upload = prepared[i];
        await tx.propertyImage.create({
          data: {
            id: imageIds[i],
            tenantId,
            propertyId,
            storageKey: upload.key,
            url: input.objectStore.getPublicUrl(upload.key),
            altText: upload.altText,
            mimeType: upload.mimeType,
            fileSize: upload.fileSize,
            sortOrder: upload.sortOrder,
            isCover: upload.isCover,
          },
        });
      }

      for (let i = 0; i < featureIds.length; i++) {
        await tx.propertyFeatureAssignment.create({
          data: {
            id: featureAssignmentIds[i],
            tenantId,
            propertyId,
            featureId: featureIds[i],
            value: null,
          },
        });
      }

      await tx.propertyAgentAccess.create({
        data: {
          id: agentAccessId,
          tenantId,
          propertyId,
          userId,
          canView: true,
          canEdit: true,
          grantedById: userId,
        },
      });

      await tx.migrationSourceRef.create({
        data: {
          id: migrationSourceRefId,
          tenantId,
          entityType: MIGRATION_ENTITY_TYPE_PROPERTY,
          entityId: propertyId,
          sourceSystem: HOUZEZ_SOURCE_SYSTEM,
          sourceId: String(wpId),
          migrationBatchId: input.batchId,
          metadata: {
            dryRunFingerprint: input.fingerprint,
            oldUrl: input.dryRun.oldUrl,
            plannedEntityCount: input.dryRun.plannedEntities.length,
            createdEntityIds: {
              propertyId,
              listingId,
              priceId,
              imageIds,
              featureAssignmentIds,
              agentAccessId,
            },
          },
        },
      });
    });
  } catch (error) {
    const compensation = await compensateUploadedKeys({
      objectStore: input.objectStore,
      uploadedKeys,
    });
    const report = baseReport();
    report.compensation = compensation;

    if (isUniqueViolation(error)) {
      report.blockers.push({
        code: 'SOURCE_ALREADY_IMPORTED',
        message:
          'Unique constraint on MigrationSourceRef — origin already imported (concurrent or preexisting). Property tree rolled back.',
      });
      report.error = 'SOURCE_ALREADY_IMPORTED';
    } else {
      report.blockers.push({
        code: 'DB_TRANSACTION_FAILED',
        message: error instanceof Error ? error.message : String(error),
      });
      report.error = 'DB_TRANSACTION_FAILED';
    }

    if (compensation.compensationFailed) {
      report.blockers.push({
        code: 'COMPENSATION_FAILED',
        message: `DB rollback done; object compensation incomplete. pendingKeys=${compensation.pendingKeys.length}.`,
      });
      report.error =
        report.error === 'SOURCE_ALREADY_IMPORTED'
          ? 'SOURCE_ALREADY_IMPORTED_COMPENSATION_FAILED'
          : 'COMPENSATION_FAILED_AFTER_DB';
      notes.push(
        `Pending object keys after failed compensation: ${compensation.pendingKeys.join(', ') || '(none)'}`,
      );
    }
    return report;
  }

  const persistedDomain: Array<{ entityType: string; id: string }> = [
    { entityType: 'property', id: propertyId },
    { entityType: 'property_listing', id: listingId },
  ];
  if (priceId) {
    persistedDomain.push({ entityType: 'property_price', id: priceId });
  }
  for (const id of imageIds) {
    persistedDomain.push({ entityType: 'property_image', id });
  }
  for (const id of featureAssignmentIds) {
    persistedDomain.push({ entityType: 'property_feature_assignment', id });
  }
  persistedDomain.push({
    entityType: 'property_agent_access',
    id: agentAccessId,
  });

  const report = baseReport();
  report.wrote = true;
  report.propertyId = propertyId;
  report.created = {
    propertyId,
    listingId,
    priceId,
    imageIds,
    featureAssignmentIds,
    agentAccessId,
    migrationSourceRefId,
  };
  report.persistedDomain = persistedDomain;
  report.domainEntityCount = persistedDomain.length;
  report.controlEntityCount = 1;
  report.compensation = {
    uploadedKeys,
    compensatedKeys: [],
    pendingKeys: [],
    compensationFailed: false,
    compensationErrors: [],
  };
  report.notes.push(
    `Persisted domain entities=${persistedDomain.length}; control MigrationSourceRef=1; dry-run plannedEntities=${input.dryRun.plannedEntities.length} (includes batch_manifest).`,
  );
  return report;
}
