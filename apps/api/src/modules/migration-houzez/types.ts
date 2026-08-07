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
  plannedEntities: PlannedEntity[];
  idempotency: IdempotencyCheck;
  warnings: WarningRecord[];
  blockers: BlockerRecord[];
  wouldWrite: false;
};

export type AuditReport = {
  mode: 'audit';
  sourceDir: string;
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
