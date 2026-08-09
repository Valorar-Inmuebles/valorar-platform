import type { MigrationEntityType } from './constants';

export type InferenceRecord = {
  field: string;
  value: unknown;
  rule: string;
  source: string;
};

export type WarningRecord = {
  code: string;
  message: string;
  wpId?: number;
};

export type BlockerRecord = {
  code: string;
  message: string;
  wpId?: number;
};

export type WordpressPropertyRaw = {
  id: number;
  status: string;
  slug: string;
  title: string;
  content: string | null;
  postDate: string | null;
  authorId: string | null;
  taxonomies: Record<string, string[]>;
  meta: Record<string, string | null>;
  /** Ordered gallery attachment ids from fave_property_images rows */
  galleryAttachmentIds: number[];
  thumbnailId: number | null;
};

export type WordpressAttachmentRaw = {
  id: number;
  parentId: number;
  mimeType: string | null;
  title: string | null;
  attachedFile: string | null;
  width: number | null;
  height: number | null;
  filesize: number | null;
};

export type WordpressSiteOptions = {
  home: string | null;
  siteurl: string | null;
  permalinkStructure: string | null;
  blogname: string | null;
};

export type DumpAuditSummary = {
  tablePrefix: string;
  fragmentFiles: string[];
  propertyCountByStatus: Record<string, number>;
  attachmentCount: number;
  postTypes: Record<string, number>;
  propertyTaxonomies: Record<string, Record<string, number>>;
  permalink: WordpressSiteOptions;
  galleryLimitBlocked: Array<{ wpId: number; galleryCount: number }>;
  multiCommercialStatusCount: number;
  notes: string[];
};

export type ImagePlanEntry = {
  sortOrder: number;
  attachmentId: number;
  isCover: boolean;
  relativePath: string | null;
  absolutePath: string | null;
  exists: boolean;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  fileSizeBytes: number | null;
  sha256: string | null;
  proposedStorageKeyPattern: string;
  proposedFilename: string;
};

export type CatalogResolution = {
  key: string;
  status: 'resolved' | 'unresolved' | 'omitted' | 'not_required';
  value?: unknown;
  detail: string;
};

export type OwnerResolution = {
  ok: boolean;
  tenantId?: string;
  tenantSlug?: string;
  userId?: string;
  email?: string;
  role?: string;
  errors: string[];
};

export type TraceabilitySchemaStatus =
  | { available: true }
  | { available: false; reason: string };

export type IdempotencyCheck = {
  schema: TraceabilitySchemaStatus;
  existingPropertyRef: {
    entityId: string;
    migrationBatchId: string;
  } | null;
  note: string;
  /** Explicit: table available for source-ref identity. */
  idempotencySchemaAvailable: boolean;
  /** Explicit: whether a DB lookup against MigrationSourceRef ran. */
  idempotencyDbCheckPerformed: boolean;
};

export type DatasetManifestReport = {
  manifestId: string;
  ok: boolean;
  datasetId?: string;
  version?: number;
  fragmentCount?: number;
  checkedFiles?: string[];
  /** Canonical fragment digests from the versioned manifest (for fingerprint binding). */
  fragmentDigests?: Array<{ fileName: string; sha256: string; bytes: number }>;
  errors?: string[];
};

export type MigrationSafetyReportSection = {
  migrationTarget: string | null;
  dbHostMasked: string | null;
  gatesSatisfied: boolean;
  dbAccessEnabled: boolean;
  skipDb: boolean;
  /** Set when production Neon GUC fingerprint was verified live. */
  neonIdentityVerified?: boolean | null;
};

export type StagingPreflightReportSection = {
  performed: boolean;
  propertyTreeEmpty: boolean;
  propertyTreeCounts: Record<string, number>;
  pilotFeaturePresent: boolean;
  geoOk: boolean;
  migrationSourceRefExists: boolean;
  baseline: { userCount: number; developmentCount: number };
  pilotBlockers: BlockerRecord[];
  informativeWarnings: WarningRecord[];
  /** Reserved hard failures for a future import/write mode. */
  importBlockers: BlockerRecord[];
};

export type PlannedEntity = {
  entityType: MigrationEntityType;
  provisionalKey: string;
  sourceId: string;
  payload: Record<string, unknown>;
};

export type DryRunReport = {
  mode: 'dry-run';
  batchId: string;
  wpId: number;
  sourceSystem: string;
  /** Bound at dry-run time for import fingerprint / CLI matching. */
  tenantSlug: string;
  ownerEmail: string;
  /**
   * SHA256 of the normalized fingerprint payload.
   * Import recalculates and must match — prevents silent report tampering.
   */
  reportFingerprint: string;
  /** Phase-A safety summary (no secrets / URLs). */
  safety: MigrationSafetyReportSection;
  datasetManifest: DatasetManifestReport;
  preflight: StagingPreflightReportSection;
  owner: OwnerResolution;
  source: WordpressPropertyRaw | null;
  transformed: Record<string, unknown> | null;
  inferences: InferenceRecord[];
  catalogs: CatalogResolution[];
  images: ImagePlanEntry[];
  imageSummary: {
    galleryCount: number;
    uniqueCount: number;
    coverAttachmentId: number | null;
    coverInGallery: boolean;
    coverPrepended: boolean;
    allOriginalsExist: boolean;
    exceedsImageLimit: boolean;
    imageLimit: number;
  } | null;
  oldUrl: {
    status: 'verified' | 'unverified' | 'unavailable';
    oldSlug: string | null;
    postDate: string | null;
    oldUrl: string | null;
    components: Record<string, string | null>;
    notes: string[];
  };
  /**
   * Planned plan/report items for this property (NOT a 1:1 list of writer DB inserts).
   * Contract (WP 5312 happy path): 12 entries =
   * property + listing + price + 7 images + feature_assignment + batch_manifest.
   * `batch_manifest` is a planning/traceability artifact only (not a Prisma table write).
   * Writer additionally persists PropertyAgentAccess + MigrationSourceRef.
   */
  plannedEntities: PlannedEntity[];
  idempotency: IdempotencyCheck;
  warnings: WarningRecord[];
  blockers: BlockerRecord[];
  wouldWrite: false;
};

export type AuditReport = {
  mode: 'audit';
  sourceDir: string;
  datasetManifest: DatasetManifestReport;
  dump: DumpAuditSummary;
  pilotContract: Record<string, unknown>;
  galleryLimitPolicy: Record<string, unknown>;
  wouldWrite: false;
};

export type RollbackPlanItem = {
  entityType: MigrationEntityType;
  entityId: string;
  sourceId: string;
  deleteOrder: number;
  notes: string;
};

export type RollbackPlan = {
  migrationBatchId: string;
  tenantId: string;
  dryRun: true;
  items: RollbackPlanItem[];
  guards: string[];
  wouldDeleteCount: number;
};
