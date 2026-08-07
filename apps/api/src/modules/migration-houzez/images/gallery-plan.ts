import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MIGRATION_MAX_PROPERTY_IMAGES } from '../constants';
import type { ImagePlanEntry } from '../types';
import type { WordpressAttachmentRaw, WordpressPropertyRaw } from '../types';

export type GalleryPlanResult = {
  images: ImagePlanEntry[];
  /** Raw fave_property_images row count (before cover merge / dedupe). */
  galleryCount: number;
  /** Final planned unique images after ID + hash dedupe. */
  uniqueCount: number;
  coverAttachmentId: number | null;
  coverInGallery: boolean;
  coverPrepended: boolean;
  allOriginalsExist: boolean;
  exceedsImageLimit: boolean;
  imageLimit: number;
  blockers: Array<{ code: string; message: string }>;
  warnings: Array<{ code: string; message: string }>;
};

/**
 * Approved image merge rules (publish wave / pilot):
 * 1. Resolve _thumbnail_id
 * 2. Resolve fave_property_images in original order
 * 3. If cover ∈ gallery → keep its position as cover, no duplicate
 * 4. If cover ∉ gallery → prepend cover
 * 5. Dedupe by attachment ID, then by content hash
 * 6. Record gallery vs final count differences
 * 7. Never silently discard the cover
 */
export function buildGalleryPlan(input: {
  property: WordpressPropertyRaw;
  attachments: Map<number, WordpressAttachmentRaw>;
  uploadsDir: string;
  tenantIdPlaceholder?: string;
  propertyIdPlaceholder?: string;
  computeHash?: boolean;
}): GalleryPlanResult {
  const tenantId = input.tenantIdPlaceholder ?? '{tenantId}';
  const propertyId = input.propertyIdPlaceholder ?? '{propertyId}';
  const blockers: Array<{ code: string; message: string }> = [];
  const warnings: Array<{ code: string; message: string }> = [];
  const coverAttachmentId = input.property.thumbnailId;
  const galleryIds = [...input.property.galleryAttachmentIds];
  const coverInGallery =
    coverAttachmentId != null && galleryIds.includes(coverAttachmentId);

  let orderedIds: number[] = [];
  let coverPrepended = false;

  if (coverAttachmentId != null && !coverInGallery) {
    coverPrepended = true;
    orderedIds = dedupeIdsPreserveOrder([coverAttachmentId, ...galleryIds]);
    warnings.push({
      code: 'COVER_NOT_IN_GALLERY',
      message: `Thumbnail ${coverAttachmentId} is not present in fave_property_images. Prepended as cover (gallery order preserved after cover).`,
    });
  } else {
    orderedIds = dedupeIdsPreserveOrder(galleryIds);
  }

  if (orderedIds.length < galleryIds.length + (coverPrepended ? 1 : 0)) {
    warnings.push({
      code: 'ATTACHMENT_ID_DEDUPE',
      message: `Removed duplicate attachment IDs while preserving first occurrence order.`,
    });
  }

  if (orderedIds.length > MIGRATION_MAX_PROPERTY_IMAGES) {
    blockers.push({
      code: 'GALLERY_EXCEEDS_LIMIT',
      message: `Planned image set has ${orderedIds.length} images before hash dedupe; limit is ${MIGRATION_MAX_PROPERTY_IMAGES}. Import blocked (no silent truncate).`,
    });
  }

  let images: ImagePlanEntry[] = orderedIds.map((attachmentId, sortOrder) =>
    planOneImage({
      attachmentId,
      sortOrder,
      isCover: coverAttachmentId === attachmentId,
      attachments: input.attachments,
      uploadsDir: input.uploadsDir,
      tenantId,
      propertyId,
      computeHash: input.computeHash !== false,
    }),
  );

  const beforeHashDedupe = images.length;
  images = dedupeByHashPreferCover(images, warnings);
  if (images.length !== beforeHashDedupe) {
    images = images.map((img, sortOrder) => ({ ...img, sortOrder }));
  }

  if (images.length > MIGRATION_MAX_PROPERTY_IMAGES) {
    blockers.push({
      code: 'GALLERY_EXCEEDS_LIMIT',
      message: `Final planned image set has ${images.length} images; limit is ${MIGRATION_MAX_PROPERTY_IMAGES}. Import blocked (no silent truncate).`,
    });
  }

  if (galleryIds.length !== images.length) {
    warnings.push({
      code: 'GALLERY_FINAL_COUNT_DIFF',
      message: `Gallery meta count=${galleryIds.length}; final planned unique images=${images.length} (coverPrepended=${coverPrepended}, coverInGallery=${coverInGallery}).`,
    });
  }

  const coverStillPresent =
    coverAttachmentId == null ||
    images.some((i) => i.attachmentId === coverAttachmentId && i.isCover);
  if (coverAttachmentId != null && !coverStillPresent) {
    blockers.push({
      code: 'COVER_DISCARDED',
      message: `Cover attachment ${coverAttachmentId} missing from final plan — refusing silent cover drop.`,
    });
  }

  const missing = images.filter((i) => !i.exists);
  if (missing.length) {
    blockers.push({
      code: 'IMAGE_ORIGINALS_MISSING',
      message: `${missing.length} planned original(s) missing on disk (attachment ids: ${missing.map((m) => m.attachmentId).join(', ')}).`,
    });
  }

  return {
    images,
    galleryCount: galleryIds.length,
    uniqueCount: images.length,
    coverAttachmentId,
    coverInGallery,
    coverPrepended,
    allOriginalsExist: missing.length === 0,
    exceedsImageLimit: images.length > MIGRATION_MAX_PROPERTY_IMAGES,
    imageLimit: MIGRATION_MAX_PROPERTY_IMAGES,
    blockers,
    warnings,
  };
}

export function dedupeIdsPreserveOrder(ids: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Drop later duplicates by sha256; never drop the cover row. */
export function dedupeByHashPreferCover(
  images: ImagePlanEntry[],
  warnings: Array<{ code: string; message: string }>,
): ImagePlanEntry[] {
  const seenHashes = new Set<string>();
  const out: ImagePlanEntry[] = [];
  for (const img of images) {
    const hash = img.sha256;
    if (!hash) {
      out.push(img);
      continue;
    }
    if (seenHashes.has(hash)) {
      if (img.isCover) {
        // Cover must win: remove earlier non-cover with same hash, keep cover.
        const idx = out.findIndex((x) => x.sha256 === hash && !x.isCover);
        if (idx >= 0) {
          warnings.push({
            code: 'HASH_DEDUPE_COVER_WINS',
            message: `Dropped earlier attachment ${out[idx].attachmentId} in favor of cover ${img.attachmentId} (same sha256).`,
          });
          out.splice(idx, 1);
          out.push(img);
          continue;
        }
        out.push(img);
        continue;
      }
      warnings.push({
        code: 'HASH_DEDUPE',
        message: `Dropped attachment ${img.attachmentId} as duplicate content of an earlier image (same sha256).`,
      });
      continue;
    }
    seenHashes.add(hash);
    out.push(img);
  }
  return out;
}

function planOneImage(input: {
  attachmentId: number;
  sortOrder: number;
  isCover: boolean;
  attachments: Map<number, WordpressAttachmentRaw>;
  uploadsDir: string;
  tenantId: string;
  propertyId: string;
  computeHash: boolean;
}): ImagePlanEntry {
  const att = input.attachments.get(input.attachmentId);
  const rel = att?.attachedFile
    ? att.attachedFile.replace(/^uploads\//, '')
    : null;
  const resolved = resolveOriginalPath(input.uploadsDir, rel);
  let sha256: string | null = null;
  if (input.computeHash && resolved.exists && resolved.absolutePath) {
    sha256 = hashFileSha256(resolved.absolutePath);
  }
  const mime =
    att?.mimeType || guessMimeFromPath(resolved.absolutePath || rel || '');
  const ext = extensionFromMimeOrPath(mime, rel);
  const proposedFilename = `${String(input.sortOrder).padStart(2, '0')}-wp${input.attachmentId}.${ext}`;

  return {
    sortOrder: input.sortOrder,
    attachmentId: input.attachmentId,
    isCover: input.isCover,
    relativePath: rel,
    absolutePath: resolved.absolutePath,
    exists: resolved.exists,
    mimeType: mime,
    width: att?.width ?? null,
    height: att?.height ?? null,
    fileSizeBytes:
      resolved.exists && resolved.absolutePath
        ? fs.statSync(resolved.absolutePath).size
        : (att?.filesize ?? null),
    sha256,
    proposedStorageKeyPattern: `${input.tenantId}/properties/${input.propertyId}/{uuid}.${ext}`,
    proposedFilename,
  };
}

export function resolveOriginalPath(
  uploadsDir: string,
  relativePath: string | null,
): { absolutePath: string | null; exists: boolean; cleaned: string | null } {
  if (!relativePath)
    return { absolutePath: null, exists: false, cleaned: null };
  const cleaned = relativePath.replace(/-\d+x\d+(?=\.[^.]+$)/, '');
  const candidates = [
    path.join(uploadsDir, relativePath),
    path.join(uploadsDir, cleaned),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return { absolutePath: candidate, exists: true, cleaned };
    }
  }
  return { absolutePath: null, exists: false, cleaned };
}

export function hashFileSha256(absolutePath: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(absolutePath));
  return hash.digest('hex');
}

function guessMimeFromPath(p: string): string | null {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return null;
}

function extensionFromMimeOrPath(
  mime: string | null,
  rel: string | null,
): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  const ext = rel ? path.extname(rel).replace('.', '').toLowerCase() : '';
  return ext || 'jpg';
}
