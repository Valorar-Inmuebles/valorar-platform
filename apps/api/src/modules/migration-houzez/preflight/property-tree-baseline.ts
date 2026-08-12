import { HOUZEZ_SOURCE_SYSTEM, PILOT_WP_ID } from '../constants';
import type { BlockerRecord, WarningRecord } from '../types';

/** Import baseline modes distinguished by property-tree state. */
export type ImportBaselineMode =
  | 'initial-empty-tree'
  | 'post-pilot-controlled'
  | 'blocked';

/** Expected child row counts for the approved WP 5312 pilot property. */
export const PILOT_EXPECTED_CHILD_COUNTS = {
  listings: 1,
  prices: 1,
  images: 7,
  featureAssignments: 1,
  agentAccesses: 1,
} as const;

export type PropertyTreeCounts = {
  Property: number;
  PropertyListing: number;
  PropertyPrice: number;
  PropertyImage: number;
  PropertyFeatureAssignment: number;
  PropertyAgentAccess: number;
};

export type PropertyTreeBaselinePrisma = {
  property: {
    findMany: (args: unknown) => Promise<Array<{ id: string }>>;
    count: (args?: unknown) => Promise<number>;
  };
  propertyListing: {
    findMany: (args: unknown) => Promise<Array<{ id: string }>>;
    count: (args?: unknown) => Promise<number>;
  };
  propertyPrice: {
    count: (args?: unknown) => Promise<number>;
  };
  propertyImage: {
    count: (args?: unknown) => Promise<number>;
  };
  propertyFeatureAssignment: {
    count: (args?: unknown) => Promise<number>;
  };
  propertyAgentAccess: {
    count: (args?: unknown) => Promise<number>;
  };
  migrationSourceRef?: {
    findMany: (args: unknown) => Promise<
      Array<{
        entityId: string;
        sourceId: string;
        entityType: string;
        migrationBatchId: string;
      }>
    >;
  };
};

export type PropertyTreeBaselineResult = {
  mode: ImportBaselineMode;
  propertyTreeEmpty: boolean;
  propertyTreeCounts: PropertyTreeCounts;
  blockers: BlockerRecord[];
  warnings: WarningRecord[];
  detail: string;
  tracedPropertyCount: number;
  pilot: {
    present: boolean;
    propertyId: string | null;
    consistent: boolean;
    detail: string;
    childCounts: {
      listings: number;
      prices: number;
      images: number;
      featureAssignments: number;
      agentAccesses: number;
    } | null;
  };
};

function emptyChildCounts() {
  return {
    listings: 0,
    prices: 0,
    images: 0,
    featureAssignments: 0,
    agentAccesses: 0,
  };
}

/**
 * Classify the tenant property tree for Houzez import:
 * - initial-empty-tree: no property-domain rows for the tenant
 * - post-pilot-controlled: pilot WP 5312 present + consistent; every property MSR-traced
 * - blocked: foreign/untraced/incomplete/inconsistent state
 *
 * Never mutates DB. Not a `--force` bypass — only two explicit safe baselines.
 */
export async function evaluatePropertyTreeBaseline(input: {
  prisma: PropertyTreeBaselinePrisma;
  tenantId: string | null;
}): Promise<PropertyTreeBaselineResult> {
  const blockers: BlockerRecord[] = [];
  const warnings: WarningRecord[] = [];

  if (!input.tenantId) {
    const propertyTreeCounts = await countTree(input.prisma, null);
    const propertyTreeEmpty = isTreeEmpty(propertyTreeCounts);
    if (!propertyTreeEmpty) {
      blockers.push({
        code: 'PROPERTY_TREE_BASELINE_TENANT_UNRESOLVED',
        message:
          'Property tree is non-empty but tenant could not be resolved — cannot classify import baseline.',
      });
    }
    return {
      mode: propertyTreeEmpty ? 'initial-empty-tree' : 'blocked',
      propertyTreeEmpty,
      propertyTreeCounts,
      blockers,
      warnings,
      detail: propertyTreeEmpty
        ? 'Tenant unresolved but global/tenant tree appears empty — treating as initial-empty-tree.'
        : 'Blocked: non-empty tree without resolved tenant.',
      tracedPropertyCount: 0,
      pilot: {
        present: false,
        propertyId: null,
        consistent: false,
        detail: 'Tenant unresolved — pilot not evaluated.',
        childCounts: null,
      },
    };
  }

  const tenantId = input.tenantId;
  const propertyTreeCounts = await countTree(input.prisma, tenantId);
  const propertyTreeEmpty = isTreeEmpty(propertyTreeCounts);

  if (propertyTreeEmpty) {
    return {
      mode: 'initial-empty-tree',
      propertyTreeEmpty: true,
      propertyTreeCounts,
      blockers: [],
      warnings: [],
      detail:
        'Import baseline=initial-empty-tree (tenant property tree empty after demo cleanup).',
      tracedPropertyCount: 0,
      pilot: {
        present: false,
        propertyId: null,
        consistent: false,
        detail: 'Pilot not present (empty tree).',
        childCounts: null,
      },
    };
  }

  if (!input.prisma.migrationSourceRef) {
    blockers.push({
      code: 'PROPERTY_TREE_NOT_EMPTY',
      message: `Property tree is non-empty (${JSON.stringify(propertyTreeCounts)}) and MigrationSourceRef delegate is unavailable — cannot verify post-pilot baseline.`,
    });
    return blockedResult({
      propertyTreeCounts,
      blockers,
      warnings,
      detail: 'Blocked: non-empty tree without MSR delegate.',
    });
  }

  const properties = await input.prisma.property.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const propertyIds = new Set(properties.map((p) => p.id));

  const propertyRefs = await input.prisma.migrationSourceRef.findMany({
    where: {
      tenantId,
      sourceSystem: HOUZEZ_SOURCE_SYSTEM,
      entityType: 'property',
    },
  });

  const refsByEntityId = new Map(propertyRefs.map((r) => [r.entityId, r]));
  const untraced = [...propertyIds].filter((id) => !refsByEntityId.has(id));
  if (untraced.length > 0) {
    blockers.push({
      code: 'UNTRACED_PROPERTIES_PRESENT',
      message: `Found ${untraced.length} tenant propert(ies) without wordpress-houzez MigrationSourceRef (entityType=property). Post-pilot import refuses foreign/untraced rows.`,
    });
  }

  const orphanRefs = propertyRefs.filter((r) => !propertyIds.has(r.entityId));
  if (orphanRefs.length > 0) {
    blockers.push({
      code: 'ORPHAN_PROPERTY_SOURCE_REFS',
      message: `Found ${orphanRefs.length} property MigrationSourceRef row(s) pointing at missing Property entityId(s).`,
    });
  }

  const pilotRef = propertyRefs.find((r) => r.sourceId === String(PILOT_WP_ID));
  if (!pilotRef) {
    blockers.push({
      code: 'PILOT_MSR_MISSING',
      message: `Post-pilot baseline requires MigrationSourceRef for WP ${PILOT_WP_ID} (entityType=property); none found while property tree is non-empty.`,
    });
    return blockedResult({
      propertyTreeCounts,
      blockers,
      warnings,
      detail: 'Blocked: non-empty tree without pilot MSR.',
      tracedPropertyCount: propertyRefs.length,
    });
  }

  if (!propertyIds.has(pilotRef.entityId)) {
    blockers.push({
      code: 'PILOT_PROPERTY_MISSING',
      message: `Pilot MSR entityId=${pilotRef.entityId} does not resolve to a Property row.`,
    });
    return blockedResult({
      propertyTreeCounts,
      blockers,
      warnings,
      detail: 'Blocked: pilot MSR orphan.',
      tracedPropertyCount: propertyRefs.length,
      pilot: {
        present: false,
        propertyId: pilotRef.entityId,
        consistent: false,
        detail: 'MSR present but Property row missing.',
        childCounts: null,
      },
    });
  }

  const childCounts = await countPilotChildren(
    input.prisma,
    tenantId,
    pilotRef.entityId,
  );
  const consistencyErrors = assertPilotChildCounts(childCounts);
  if (consistencyErrors.length) {
    blockers.push({
      code: 'PILOT_TREE_INCONSISTENT',
      message: `Pilot WP ${PILOT_WP_ID} property tree is incomplete/inconsistent: ${consistencyErrors.join('; ')}.`,
    });
  }

  if (blockers.length) {
    return blockedResult({
      propertyTreeCounts,
      blockers,
      warnings,
      detail: 'Blocked: post-pilot baseline checks failed.',
      tracedPropertyCount: propertyRefs.length,
      pilot: {
        present: true,
        propertyId: pilotRef.entityId,
        consistent: false,
        detail: consistencyErrors.join('; ') || 'Other baseline blockers.',
        childCounts,
      },
    });
  }

  warnings.push({
    code: 'POST_PILOT_BASELINE',
    message: `Import baseline=post-pilot-controlled (pilot WP ${PILOT_WP_ID} intact; tracedProperties=${propertyRefs.length}).`,
  });

  return {
    mode: 'post-pilot-controlled',
    propertyTreeEmpty: false,
    propertyTreeCounts,
    blockers: [],
    warnings,
    detail: `Import baseline=post-pilot-controlled — pilot WP ${PILOT_WP_ID} consistent; all ${propertyRefs.length} tenant propert(ies) MSR-traced.`,
    tracedPropertyCount: propertyRefs.length,
    pilot: {
      present: true,
      propertyId: pilotRef.entityId,
      consistent: true,
      detail: `Pilot propertyId=${pilotRef.entityId} matches expected child counts.`,
      childCounts,
    },
  };
}

function blockedResult(input: {
  propertyTreeCounts: PropertyTreeCounts;
  blockers: BlockerRecord[];
  warnings: WarningRecord[];
  detail: string;
  tracedPropertyCount?: number;
  pilot?: PropertyTreeBaselineResult['pilot'];
}): PropertyTreeBaselineResult {
  return {
    mode: 'blocked',
    propertyTreeEmpty: false,
    propertyTreeCounts: input.propertyTreeCounts,
    blockers: input.blockers,
    warnings: input.warnings,
    detail: input.detail,
    tracedPropertyCount: input.tracedPropertyCount ?? 0,
    pilot: input.pilot ?? {
      present: false,
      propertyId: null,
      consistent: false,
      detail: 'Pilot not validated.',
      childCounts: null,
    },
  };
}

function isTreeEmpty(counts: PropertyTreeCounts): boolean {
  return Object.values(counts).every((c) => c === 0);
}

async function countTree(
  prisma: PropertyTreeBaselinePrisma,
  tenantId: string | null,
): Promise<PropertyTreeCounts> {
  const where = tenantId ? { where: { tenantId } } : undefined;
  const [
    Property,
    PropertyListing,
    PropertyPrice,
    PropertyImage,
    PropertyFeatureAssignment,
    PropertyAgentAccess,
  ] = await Promise.all([
    prisma.property.count(where),
    prisma.propertyListing.count(where),
    prisma.propertyPrice.count(where),
    prisma.propertyImage.count(where),
    prisma.propertyFeatureAssignment.count(where),
    prisma.propertyAgentAccess.count(where),
  ]);
  return {
    Property,
    PropertyListing,
    PropertyPrice,
    PropertyImage,
    PropertyFeatureAssignment,
    PropertyAgentAccess,
  };
}

async function countPilotChildren(
  prisma: PropertyTreeBaselinePrisma,
  tenantId: string,
  propertyId: string,
): Promise<{
  listings: number;
  prices: number;
  images: number;
  featureAssignments: number;
  agentAccesses: number;
}> {
  const listingRows = await prisma.propertyListing.findMany({
    where: { tenantId, propertyId },
    select: { id: true },
  });
  const listingIds = listingRows.map((l) => l.id);
  const [prices, images, featureAssignments, agentAccesses] = await Promise.all(
    [
      listingIds.length
        ? prisma.propertyPrice.count({
            where: { tenantId, listingId: { in: listingIds } },
          })
        : Promise.resolve(0),
      prisma.propertyImage.count({ where: { tenantId, propertyId } }),
      prisma.propertyFeatureAssignment.count({
        where: { tenantId, propertyId },
      }),
      prisma.propertyAgentAccess.count({ where: { tenantId, propertyId } }),
    ],
  );

  return {
    listings: listingRows.length,
    prices,
    images,
    featureAssignments,
    agentAccesses,
  };
}

function assertPilotChildCounts(counts: {
  listings: number;
  prices: number;
  images: number;
  featureAssignments: number;
  agentAccesses: number;
}): string[] {
  const errors: string[] = [];
  const expected = PILOT_EXPECTED_CHILD_COUNTS;
  if (counts.listings !== expected.listings) {
    errors.push(`listings=${counts.listings} expected ${expected.listings}`);
  }
  if (counts.prices !== expected.prices) {
    errors.push(`prices=${counts.prices} expected ${expected.prices}`);
  }
  if (counts.images !== expected.images) {
    errors.push(`images=${counts.images} expected ${expected.images}`);
  }
  if (counts.featureAssignments !== expected.featureAssignments) {
    errors.push(
      `featureAssignments=${counts.featureAssignments} expected ${expected.featureAssignments}`,
    );
  }
  if (counts.agentAccesses !== expected.agentAccesses) {
    errors.push(
      `agentAccesses=${counts.agentAccesses} expected ${expected.agentAccesses}`,
    );
  }
  return errors;
}

/** Pure helper for unit tests — compare expected pilot shape without DB. */
export function pilotChildCountsMatch(counts: {
  listings: number;
  prices: number;
  images: number;
  featureAssignments: number;
  agentAccesses: number;
}): boolean {
  return assertPilotChildCounts(counts).length === 0;
}

export function emptyPilotChildCounts() {
  return emptyChildCounts();
}
