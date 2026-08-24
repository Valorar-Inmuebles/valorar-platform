import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import {
  DEVELOPMENT_ENTITY_TYPE,
  DEVELOPMENT_IMAGE_ENTITY_TYPE,
  DEVELOPMENTS_SOURCE_SYSTEM,
} from '../constants';
import type {
  DevelopmentPlan,
  ImportRecordResult,
  PlannedImage,
  SourceIssue,
} from '../types';
import type { MigrationObjectStore } from './object-store';
import { buildDevelopmentImageStorageKey } from './storage-keys';

export type WriterCreatedIds = {
  developmentId: string;
  imageIds: string[];
  featureAssignmentIds: string[];
  sourceRefIds: string[];
};

export type WriterPrismaTx = {
  development: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  developmentImage: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  developmentFeatureAssignment: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  developmentTypology: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  property: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  migrationSourceRef: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
};

export type WriterPrisma = {
  $transaction: <T>(fn: (tx: WriterPrismaTx) => Promise<T>) => Promise<T>;
  development: {
    findUnique: (args: unknown) => Promise<{
      id: string;
      slug: string;
      internalCode: string | null;
    } | null>;
    findFirst?: (args: unknown) => Promise<{ id: string } | null>;
  };
  migrationSourceRef: {
    findUnique: (args: unknown) => Promise<{
      entityId: string;
      entityType: string;
      metadata: unknown;
    } | null>;
  };
};

export type PreparedImage = {
  plan: PlannedImage;
  key: string;
  body: Buffer;
  contentType: string;
  checksumSha256: string;
  reused: boolean;
};

function refKey(input: {
  tenantId: string;
  sourceId: string;
  entityType: string;
}) {
  return {
    tenantId_sourceSystem_sourceId_entityType: {
      tenantId: input.tenantId,
      sourceSystem: DEVELOPMENTS_SOURCE_SYSTEM,
      sourceId: input.sourceId,
      entityType: input.entityType,
    },
  };
}

function uniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  return code === 'P2002';
}

export async function prepareImageObject(input: {
  image: PlannedImage;
  tenantId: string;
  sourceId: string;
  objectStore: MigrationObjectStore;
}): Promise<{ prepared: PreparedImage; error: string | null }> {
  const key = buildDevelopmentImageStorageKey({
    tenantId: input.tenantId,
    sourceId: input.sourceId,
    filename: input.image.filename,
  });
  const body = fs.readFileSync(input.image.absolutePath);
  const checksumSha256 = crypto.createHash('sha256').update(body).digest('hex');
  const contentType = input.image.mimeType ?? 'application/octet-stream';
  const head = await input.objectStore.headObject(key);

  if (!head.exists) {
    return {
      prepared: {
        plan: input.image,
        key,
        body,
        contentType,
        checksumSha256,
        reused: false,
      },
      error: null,
    };
  }

  const existingSha = head.metadata.sha256 ?? null;
  const sizeMatches =
    head.contentLength == null || head.contentLength === body.length;
  const typeMatches =
    !head.contentType ||
    head.contentType.split(';')[0].trim().toLowerCase() ===
      contentType.split(';')[0].trim().toLowerCase();
  const hashMatches = !existingSha || existingSha === checksumSha256;

  if (sizeMatches && typeMatches && hashMatches) {
    return {
      prepared: {
        plan: input.image,
        key,
        body,
        contentType,
        checksumSha256,
        reused: true,
      },
      error: null,
    };
  }

  return {
    prepared: {
      plan: input.image,
      key,
      body,
      contentType,
      checksumSha256,
      reused: false,
    },
    error: `Preexisting storage object for ${input.image.filename} does not match the source file. Refusing overwrite of ${key}.`,
  };
}

async function uploadPreparedImages(input: {
  images: PreparedImage[];
  objectStore: MigrationObjectStore;
  sourceId: string;
}): Promise<{ uploaded: number; reused: number; orphanKeys: string[] }> {
  let uploaded = 0;
  let reused = 0;
  const orphanKeys: string[] = [];

  for (const image of input.images) {
    if (image.reused) {
      reused += 1;
      continue;
    }
    const result = await input.objectStore.putObject({
      key: image.key,
      body: image.body,
      contentType: image.contentType,
      metadata: {
        sha256: image.checksumSha256,
        sourceid: input.sourceId,
        sourcesystem: DEVELOPMENTS_SOURCE_SYSTEM,
      },
    });
    if (result.wrote) {
      uploaded += 1;
      orphanKeys.push(image.key);
    } else {
      reused += 1;
    }
  }

  return { uploaded, reused, orphanKeys };
}

export async function writeOneDevelopment(input: {
  prisma: WriterPrisma;
  objectStore: MigrationObjectStore;
  plan: DevelopmentPlan;
  tenantId: string;
  createdById: string;
  batchId: string;
  countryId: string | null;
  provinceId: string;
  localityId: string;
  featureIdsBySlug: Map<string, string>;
}): Promise<ImportRecordResult> {
  const { plan } = input;
  const warnings: SourceIssue[] = [...plan.warnings];
  const errors: string[] = [];

  if (plan.planStatus === 'blocked' || plan.blockers.length > 0) {
    return {
      sourceId: plan.sourceId,
      title: plan.title,
      status: 'blocked',
      developmentId: null,
      imagesCreated: 0,
      imagesUploaded: 0,
      imagesReused: 0,
      featuresAssigned: 0,
      refsCreated: 0,
      warnings,
      errors: plan.blockers.map((issue) => issue.message),
      orphanStorageKeys: [],
    };
  }

  if (plan.persistTypologies !== false) {
    return {
      sourceId: plan.sourceId,
      title: plan.title,
      status: 'error',
      developmentId: null,
      imagesCreated: 0,
      imagesUploaded: 0,
      imagesReused: 0,
      featuresAssigned: 0,
      refsCreated: 0,
      warnings,
      errors: ['persistTypologies must remain false.'],
      orphanStorageKeys: [],
    };
  }

  if (!plan.coverImage || plan.gallery.length === 0) {
    return {
      sourceId: plan.sourceId,
      title: plan.title,
      status: 'blocked',
      developmentId: null,
      imagesCreated: 0,
      imagesUploaded: 0,
      imagesReused: 0,
      featuresAssigned: 0,
      refsCreated: 0,
      warnings,
      errors: ['A cover image is required before activating a development.'],
      orphanStorageKeys: [],
    };
  }

  const existingRef = await input.prisma.migrationSourceRef.findUnique({
    where: refKey({
      tenantId: input.tenantId,
      sourceId: plan.sourceId,
      entityType: DEVELOPMENT_ENTITY_TYPE,
    }),
  });

  if (existingRef) {
    const existing = await input.prisma.development.findUnique({
      where: { id: existingRef.entityId },
    });
    if (!existing) {
      return {
        sourceId: plan.sourceId,
        title: plan.title,
        status: 'error',
        developmentId: existingRef.entityId,
        imagesCreated: 0,
        imagesUploaded: 0,
        imagesReused: 0,
        featuresAssigned: 0,
        refsCreated: 0,
        warnings,
        errors: [
          `MigrationSourceRef exists for ${plan.sourceId} but the Development row is missing. Refusing to recreate.`,
        ],
        orphanStorageKeys: [],
      };
    }
    return {
      sourceId: plan.sourceId,
      title: plan.title,
      status: 'already_imported',
      developmentId: existing.id,
      imagesCreated: 0,
      imagesUploaded: 0,
      imagesReused: 0,
      featuresAssigned: 0,
      refsCreated: 0,
      warnings,
      errors: [],
      orphanStorageKeys: [],
    };
  }

  const slugHit = await input.prisma.development.findUnique({
    where: {
      tenantId_slug: { tenantId: input.tenantId, slug: plan.slug },
    },
  });
  if (slugHit) {
    return {
      sourceId: plan.sourceId,
      title: plan.title,
      status: 'conflict',
      developmentId: slugHit.id,
      imagesCreated: 0,
      imagesUploaded: 0,
      imagesReused: 0,
      featuresAssigned: 0,
      refsCreated: 0,
      warnings,
      errors: [
        `Slug "${plan.slug}" already exists without a ${DEVELOPMENTS_SOURCE_SYSTEM} source ref. Refusing to take over the row.`,
      ],
      orphanStorageKeys: [],
    };
  }

  const codeHit = await input.prisma.development.findUnique({
    where: {
      tenantId_internalCode: {
        tenantId: input.tenantId,
        internalCode: plan.internalCode,
      },
    },
  });
  if (codeHit) {
    return {
      sourceId: plan.sourceId,
      title: plan.title,
      status: 'conflict',
      developmentId: codeHit.id,
      imagesCreated: 0,
      imagesUploaded: 0,
      imagesReused: 0,
      featuresAssigned: 0,
      refsCreated: 0,
      warnings,
      errors: [
        `internalCode "${plan.internalCode}" already exists without a ${DEVELOPMENTS_SOURCE_SYSTEM} source ref. Refusing to take over the row.`,
      ],
      orphanStorageKeys: [],
    };
  }

  const prepared: PreparedImage[] = [];
  for (const image of plan.gallery) {
    const result = await prepareImageObject({
      image,
      tenantId: input.tenantId,
      sourceId: plan.sourceId,
      objectStore: input.objectStore,
    });
    if (result.error) {
      errors.push(result.error);
    } else {
      prepared.push(result.prepared);
    }
  }
  if (errors.length) {
    return {
      sourceId: plan.sourceId,
      title: plan.title,
      status: 'error',
      developmentId: null,
      imagesCreated: 0,
      imagesUploaded: 0,
      imagesReused: 0,
      featuresAssigned: 0,
      refsCreated: 0,
      warnings,
      errors,
      orphanStorageKeys: [],
    };
  }

  const upload = await uploadPreparedImages({
    images: prepared,
    objectStore: input.objectStore,
    sourceId: plan.sourceId,
  });

  const missingFeatures: string[] = [];
  const featureIds: string[] = [];
  for (const feature of plan.matchedFeatures) {
    const id = input.featureIdsBySlug.get(feature.slug);
    if (!id) {
      missingFeatures.push(feature.slug);
      warnings.push({
        code: 'FEATURE_NOT_IN_CATALOG',
        severity: 'warning',
        blocking: false,
        message: `Planned feature "${feature.slug}" is not present in the development catalog. Left in description; not created.`,
      });
      continue;
    }
    featureIds.push(id);
  }

  try {
    const created = await input.prisma.$transaction(async (tx) => {
      const development = await tx.development.create({
        data: {
          tenantId: input.tenantId,
          createdById: input.createdById,
          title: plan.title,
          slug: plan.slug,
          internalCode: plan.internalCode,
          shortDescription: plan.shortDescription,
          description: plan.description,
          status: plan.status,
          isActive: true,
          sortOrder: plan.sortOrder,
          countryId: input.countryId,
          provinceId: input.provinceId,
          localityId: input.localityId,
          neighborhoodId: null,
          country: 'AR',
          province: plan.location.provinceName,
          city: plan.location.localityName,
          neighborhood: null,
          street: plan.street,
          streetNumber: plan.streetNumber,
          hasFinancing: plan.hasFinancing,
          financingDescription: plan.financingDescription,
          hasParkingSpaces: plan.hasParkingSpaces,
          parkingSpacesCount: plan.parkingSpacesCount,
          priceFrom: null,
          currency: null,
          latitude: null,
          longitude: null,
        },
      });

      const imageIds: string[] = [];
      const sourceRefIds: string[] = [];
      let coverCount = 0;

      for (const image of prepared) {
        const row = await tx.developmentImage.create({
          data: {
            tenantId: input.tenantId,
            developmentId: development.id,
            storageKey: image.key,
            url: input.objectStore.getPublicUrl(image.key),
            altText: image.plan.altText,
            mimeType: image.contentType,
            fileSize: image.body.length,
            sortOrder: image.plan.sortOrder,
            isCover: image.plan.isCover,
          },
        });
        imageIds.push(row.id);
        if (image.plan.isCover) coverCount += 1;

        const imageRef = await tx.migrationSourceRef.create({
          data: {
            tenantId: input.tenantId,
            entityType: DEVELOPMENT_IMAGE_ENTITY_TYPE,
            entityId: row.id,
            sourceSystem: DEVELOPMENTS_SOURCE_SYSTEM,
            sourceId: image.plan.migrationSourceId,
            migrationBatchId: input.batchId,
            metadata: {
              filename: image.plan.filename,
              checksumSha256: image.checksumSha256,
              storageKey: image.key,
              isCover: image.plan.isCover,
              sortOrder: image.plan.sortOrder,
            },
          },
        });
        sourceRefIds.push(imageRef.id);
      }

      if (coverCount !== 1) {
        throw new Error(
          `Expected exactly one cover image, found ${coverCount}.`,
        );
      }

      const featureAssignmentIds: string[] = [];
      for (const featureId of featureIds) {
        const assignment = await tx.developmentFeatureAssignment.create({
          data: {
            tenantId: input.tenantId,
            developmentId: development.id,
            featureId,
          },
        });
        featureAssignmentIds.push(assignment.id);
      }

      const rootRef = await tx.migrationSourceRef.create({
        data: {
          tenantId: input.tenantId,
          entityType: DEVELOPMENT_ENTITY_TYPE,
          entityId: development.id,
          sourceSystem: DEVELOPMENTS_SOURCE_SYSTEM,
          sourceId: plan.sourceId,
          migrationBatchId: input.batchId,
          metadata: {
            fingerprintSha256: plan.fingerprintSha256,
            sortOrder: plan.sortOrder,
            slug: plan.slug,
            internalCode: plan.internalCode,
            persistTypologies: false,
          },
        },
      });
      sourceRefIds.push(rootRef.id);

      return {
        developmentId: development.id,
        imageIds,
        featureAssignmentIds,
        sourceRefIds,
      } satisfies WriterCreatedIds;
    });

    return {
      sourceId: plan.sourceId,
      title: plan.title,
      status: 'created',
      developmentId: created.developmentId,
      imagesCreated: created.imageIds.length,
      imagesUploaded: upload.uploaded,
      imagesReused: upload.reused,
      featuresAssigned: created.featureAssignmentIds.length,
      refsCreated: created.sourceRefIds.length,
      warnings,
      errors: [],
      orphanStorageKeys: [],
    };
  } catch (error) {
    if (uniqueViolation(error)) {
      return {
        sourceId: plan.sourceId,
        title: plan.title,
        status: 'already_imported',
        developmentId: null,
        imagesCreated: 0,
        imagesUploaded: upload.uploaded,
        imagesReused: upload.reused,
        featuresAssigned: 0,
        refsCreated: 0,
        warnings,
        errors: [],
        orphanStorageKeys: upload.orphanKeys,
      };
    }
    return {
      sourceId: plan.sourceId,
      title: plan.title,
      status: 'error',
      developmentId: null,
      imagesCreated: 0,
      imagesUploaded: upload.uploaded,
      imagesReused: upload.reused,
      featuresAssigned: 0,
      refsCreated: 0,
      warnings,
      errors: [
        error instanceof Error ? error.message : 'Database transaction failed.',
      ],
      orphanStorageKeys: upload.orphanKeys,
    };
  }
}
