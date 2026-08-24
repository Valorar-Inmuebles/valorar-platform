import type { SupportedImageExtension } from './constants';

export type PlannedDevelopmentStatus =
  | 'IN_PIT'
  | 'UNDER_CONSTRUCTION'
  | 'COMPLETED';

export type IssueSeverity = 'warning' | 'error';

export type IssueCode =
  | 'MISSING_TXT'
  | 'DUPLICATE_TXT'
  | 'MISSING_COVER'
  | 'DUPLICATE_IMAGE_STEM'
  | 'INVALID_FOLDER_NAME'
  | 'EMPTY_PUBLIC_NAME'
  | 'UNEXPECTED_FILE'
  | 'UNSUPPORTED_IMAGE'
  | 'FILE_TOO_LARGE'
  | 'TOO_MANY_IMAGES'
  | 'STALE_DEVELOPMENT_STATUS'
  | 'UNKNOWN_DEVELOPMENT_STATUS'
  | 'UNRESOLVED_LOCALITY'
  | 'AMBIGUOUS_LOCALITY'
  | 'MISSING_CATALOG_LOCALITY'
  | 'MISSING_CATALOG_PROVINCE'
  | 'SOURCE_STATUS_OVERRIDDEN'
  | 'WEAK_FINANCING_TEXT'
  | 'UNIT_LIKE_COPY'
  | 'MISSING_TITLE_IN_TXT'
  | 'EDITORIAL_CORRECTION'
  | 'ENCODING_CORRECTED'
  | 'DUPLICATE_FRAGMENT_REMOVED'
  | 'GENERIC_PARKING_WITHOUT_COUNT'
  | 'TITLE_NORMALIZED'
  | 'FEATURE_NOT_IN_CATALOG'
  | 'STORAGE_OBJECT_MISMATCH'
  | 'SLUG_CONFLICT'
  | 'INTERNAL_CODE_CONFLICT';

export type SourceIssue = {
  code: IssueCode;
  severity: IssueSeverity;
  message: string;
  blocking: boolean;
};

export type EditorialCorrection = {
  field: string;
  original: string;
  normalized: string;
  reason: string;
};

export type InventoryImage = {
  absolutePath: string;
  filename: string;
  stem: string;
  stemNumber: number;
  extension: SupportedImageExtension;
  mimeType: string | null;
  fileSize: number;
  checksumSha256: string;
  isCover: boolean;
  sortOrder: number;
  storageKeyTemplate: string;
  migrationSourceId: string;
};

export type FolderInventory = {
  absolutePath: string;
  folderName: string;
  sourceId: string;
  ordinal: number;
  publicNameFromFolder: string;
  txtFiles: string[];
  images: InventoryImage[];
  unexpectedFiles: string[];
  issues: SourceIssue[];
};

export type FeatureMatch = {
  slug: string;
  name: string;
  evidence: string;
};

export type UnmatchedFeature = {
  label: string;
  evidence: string;
};

export type DetectedTypology = {
  name: string;
  evidence: string;
};

export type LocationResolutionStatus =
  | 'resolved'
  | 'ambiguous'
  | 'unresolved'
  | 'missing';

export type LocationResolution = {
  provinceName: string | null;
  provinceSlug: string | null;
  provinceIsoCode: string | null;
  provinceId: string | null;
  localityName: string | null;
  localitySlug: string | null;
  localitySearch: string | null;
  localityId: string | null;
  status: LocationResolutionStatus;
  evidence: string[];
  candidates: string[];
};

export type MissingCatalogEntry = {
  kind: 'province' | 'locality';
  model: 'Province' | 'Locality';
  requiredName: string;
  provinceName: string;
  provinceSlug: string | null;
  sourceIds: string[];
  officialCreateMechanism: string;
};

export type PlannedImage = InventoryImage & {
  altText: string;
};

export type PlanStatus = 'ready' | 'ready_with_warnings' | 'blocked';

export type DevelopmentPlan = {
  sourceSystem: 'local-developments-v1';
  sourceId: string;
  entityType: 'development';
  internalCode: string;
  sortOrder: number;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  status: PlannedDevelopmentStatus | null;
  street: string | null;
  streetNumber: string | null;
  location: LocationResolution;
  hasFinancing: boolean;
  financingDescription: string | null;
  hasParkingSpaces: boolean;
  parkingSpacesCount: number | null;
  priceFrom: null;
  currency: null;
  matchedFeatures: FeatureMatch[];
  unmatchedFeatures: UnmatchedFeature[];
  ambiguousFeatures: UnmatchedFeature[];
  detectedTypologies: DetectedTypology[];
  persistTypologies: false;
  coverImage: PlannedImage | null;
  gallery: PlannedImage[];
  editorialCorrections: EditorialCorrection[];
  warnings: SourceIssue[];
  errors: SourceIssue[];
  blockers: SourceIssue[];
  catalogGap: Omit<MissingCatalogEntry, 'sourceIds'> | null;
  planStatus: PlanStatus;
  fingerprintSha256: string;
};

export type AuditFolderSummary = {
  sourceId: string | null;
  folderName: string;
  publicName: string | null;
  txtFile: string | null;
  imageCount: number;
  coverImage: string | null;
  extensions: string[];
  unexpectedFiles: string[];
  warnings: SourceIssue[];
  errors: SourceIssue[];
  valid: boolean;
};

export type AuditReport = {
  command: 'audit';
  sourcePath: string;
  folderCount: number;
  txtCount: number;
  imageCount: number;
  coverCount: number;
  validFolders: number;
  invalidFolders: number;
  folders: AuditFolderSummary[];
  warnings: SourceIssue[];
  errors: SourceIssue[];
  writes: { database: false; storage: false };
};

export type DryRunReport = {
  command: 'dry-run';
  sourcePath: string;
  sourceSystem: 'local-developments-v1';
  folderCount: number;
  txtCount: number;
  imageCount: number;
  readyCount: number;
  readyWithWarningsCount: number;
  blockedCount: number;
  developments: DevelopmentPlan[];
  missingCatalogEntries: MissingCatalogEntry[];
  writes: { database: false; storage: false };
};

export type CliCommand =
  | 'audit'
  | 'dry-run'
  | 'preflight'
  | 'import'
  | 'cleanup';

export type CliOptions = {
  command: CliCommand;
  sourcePath?: string;
  json?: boolean;
  tenantId?: string;
  tenant?: string;
  createdBy?: string;
  target?: string;
  confirm?: string;
  dryRun?: boolean;
  execute?: boolean;
};

export type GateIssue = {
  code: string;
  message: string;
  blocking: boolean;
};

export type SanitizedEnvironment = {
  target: string;
  dbHostMasked: string | null;
  dbName: string | null;
  neonProjectMasked: string | null;
  neonBranchMasked: string | null;
  neonEndpointMasked: string | null;
  storageBucket: string | null;
  storageEndpointHostMasked: string | null;
};

export type ResolvedActor = {
  tenantId: string;
  tenantSlug: string;
  tenantStatus: string;
  userId: string;
  email: string;
  isActive: boolean;
  role: string;
};

export type MigrationInspection = {
  applied: string[];
  pending: string[];
  failed: string[];
  unexpected: string[];
  migrationSourceRefExists: boolean;
  sortOrderColumnExists: boolean;
  drift: boolean;
};

export type PreflightReport = {
  command: 'preflight';
  ok: boolean;
  environment: SanitizedEnvironment;
  tenant: {
    id: string | null;
    slug: string | null;
    status: string | null;
  };
  creator: {
    id: string | null;
    email: string | null;
    isActive: boolean | null;
    role: string | null;
  };
  catalog: {
    province: string | null;
    localityCount: number;
    requiredLocalities: string[];
    missingLocalities: string[];
  };
  features: {
    planned: string[];
    present: string[];
    missing: string[];
  };
  migrations: MigrationInspection;
  conflicts: Array<{
    sourceId: string;
    kind: 'slug' | 'internalCode';
    value: string;
  }>;
  existingSourceRefs: number;
  connectivity: {
    database: boolean;
    storage: boolean;
  };
  planned: {
    developments: number;
    images: number;
    covers: number;
    blocked: number;
  };
  blockers: GateIssue[];
  warnings: GateIssue[];
  writes: { database: false; storage: false };
};

export type ImportRecordStatus =
  | 'created'
  | 'already_imported'
  | 'skipped'
  | 'conflict'
  | 'blocked'
  | 'error';

export type ImportRecordResult = {
  sourceId: string;
  title: string;
  status: ImportRecordStatus;
  developmentId: string | null;
  imagesCreated: number;
  imagesUploaded: number;
  imagesReused: number;
  featuresAssigned: number;
  refsCreated: number;
  warnings: SourceIssue[];
  errors: string[];
  orphanStorageKeys: string[];
};

export type ImportReport = {
  command: 'import';
  ok: boolean;
  environment: SanitizedEnvironment;
  tenant: { id: string; slug: string };
  creator: { id: string; email: string; role: string };
  planned: number;
  alreadyImported: number;
  created: number;
  skipped: number;
  conflicts: number;
  blocked: number;
  errors: number;
  warnings: number;
  imagesUploaded: number;
  imagesReused: number;
  databaseWrites: number;
  storageWrites: number;
  records: ImportRecordResult[];
  blockers: GateIssue[];
  writes: { database: boolean; storage: boolean };
};

export type CleanupCounts = {
  developments: number;
  images: number;
  featureAssignments: number;
  typologies: number;
  sourceRefs: number;
  storageObjects: number;
};

export type CleanupReport = {
  command: 'cleanup';
  mode: 'dry-run' | 'execute';
  ok: boolean;
  executed: boolean;
  environment: SanitizedEnvironment;
  tenant: { id: string | null; slug: string | null };
  sourceSystem: 'local-developments-v1';
  storagePrefix: string | null;
  counts: CleanupCounts;
  deleted: CleanupCounts;
  blockers: GateIssue[];
  warnings: GateIssue[];
  writes: { database: boolean; storage: boolean };
};
