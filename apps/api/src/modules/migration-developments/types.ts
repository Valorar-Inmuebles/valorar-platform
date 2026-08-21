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
  | 'TITLE_NORMALIZED';

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

export type CliCommand = 'audit' | 'dry-run';

export type CliOptions = {
  command: CliCommand;
  sourcePath?: string;
  json?: boolean;
  tenantId?: string;
};
