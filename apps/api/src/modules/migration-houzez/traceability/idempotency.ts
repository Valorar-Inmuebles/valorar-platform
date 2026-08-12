import { HOUZEZ_SOURCE_SYSTEM, type MigrationEntityType } from '../constants';
import type {
  IdempotencyCheck,
  RollbackPlan,
  RollbackPlanItem,
  TraceabilitySchemaStatus,
} from '../types';

export type TraceabilityClient = {
  migrationSourceRef?: {
    findUnique: (args: unknown) => Promise<{
      entityId: string;
      migrationBatchId: string;
      entityType: string;
      metadata: unknown;
    } | null>;
    findMany: (args: unknown) => Promise<
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
  };
};

export async function detectTraceabilitySchema(
  prisma:
    | { $queryRawUnsafe?: (q: string) => Promise<unknown> }
    | TraceabilityClient,
): Promise<TraceabilitySchemaStatus> {
  try {
    if (
      '$queryRawUnsafe' in prisma &&
      typeof prisma.$queryRawUnsafe === 'function'
    ) {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MigrationSourceRef' LIMIT 1`,
      )) as unknown[];
      if (Array.isArray(rows) && rows.length > 0) {
        return { available: true };
      }
      return {
        available: false,
        reason:
          'Table "MigrationSourceRef" not found. Prisma migration 202608070001_migration_source_ref is prepared but not applied.',
      };
    }
    if ('migrationSourceRef' in prisma && prisma.migrationSourceRef) {
      return { available: true };
    }
    return {
      available: false,
      reason: 'Prisma client has no migrationSourceRef delegate.',
    };
  } catch (error) {
    return {
      available: false,
      reason: `Traceability schema probe failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function checkPropertyIdempotency(input: {
  prisma: TraceabilityClient;
  schema: TraceabilitySchemaStatus;
  tenantId: string;
  sourceId: string;
}): Promise<IdempotencyCheck> {
  if (!input.schema.available) {
    return {
      schema: input.schema,
      existingPropertyRef: null,
      note: 'Idempotency schema not available — DB source-ref check omitted. Deterministic sourceSystem/sourceId rules still apply in planning. Required before any import/write.',
      idempotencySchemaAvailable: false,
      idempotencyDbCheckPerformed: false,
    };
  }

  const ref = await input.prisma.migrationSourceRef!.findUnique({
    where: {
      tenantId_sourceSystem_sourceId_entityType: {
        tenantId: input.tenantId,
        sourceSystem: HOUZEZ_SOURCE_SYSTEM,
        sourceId: input.sourceId,
        entityType: 'property',
      },
    },
  });

  return {
    schema: input.schema,
    existingPropertyRef: ref
      ? { entityId: ref.entityId, migrationBatchId: ref.migrationBatchId }
      : null,
    note: ref
      ? 'Existing MigrationSourceRef found for this tenant/sourceSystem/sourceId/entityType=property.'
      : 'No existing property source ref for this identity.',
    idempotencySchemaAvailable: true,
    idempotencyDbCheckPerformed: true,
  };
}

/** Delete order for a future rollback (dry-run plan only). */
const DELETE_ORDER: Record<MigrationEntityType, number> = {
  property_feature_assignment: 10,
  property_image: 20,
  property_price: 30,
  property_listing: 40,
  property: 50,
  batch_manifest: 60,
};

export function buildRollbackPlan(input: {
  migrationBatchId: string;
  tenantId: string;
  refs: Array<{
    entityType: string;
    entityId: string;
    sourceId: string;
    updatedAt: Date;
    createdAt: Date;
    metadata: unknown;
  }>;
}): RollbackPlan {
  const items: RollbackPlanItem[] = input.refs
    .map((ref) => ({
      entityType: ref.entityType as MigrationEntityType,
      entityId: ref.entityId,
      sourceId: ref.sourceId,
      deleteOrder: DELETE_ORDER[ref.entityType as MigrationEntityType] ?? 100,
      notes: 'Planned only — not executed.',
    }))
    .sort((a, b) => a.deleteOrder - b.deleteOrder);

  return {
    migrationBatchId: input.migrationBatchId,
    tenantId: input.tenantId,
    dryRun: true,
    items,
    guards: [
      'Select exclusively entities created by this migrationBatchId.',
      'Refuse if entity updatedAt indicates post-migration edits (compare metadata.importedAt).',
      'Refuse if entity is referenced by non-migration leads/relations outside batch.',
      'Never delete global catalogs (PropertyFeature, geo tables).',
      'Present dry-run plan before any delete.',
      'Delete in transactional order: feature assignments → images (+ storage objects) → prices → listings → property → source refs.',
    ],
    wouldDeleteCount: items.length,
  };
}

export function assertSourceIdentityRules(input: {
  existingSameTenantProperty: boolean;
  existingOtherTenantProperty: boolean;
  existingSameSourceDifferentEntityType: boolean;
}): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (input.existingSameTenantProperty) {
    errors.push(
      'Idempotent hit: property source ref already exists for this tenant — re-import must update-or-skip, not duplicate.',
    );
  }
  // other tenant same sourceId is allowed (unique includes tenantId)
  if (input.existingSameSourceDifferentEntityType) {
    // allowed by unique key (entityType differs)
  }
  return { ok: errors.length === 0, errors };
}
