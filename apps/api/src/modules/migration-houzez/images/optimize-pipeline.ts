import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import sharp from 'sharp';
import { buildHouzezMigrationImageKey } from '../writer/storage-keys';
import type {
  ImagePlanEntry,
  ImageOptimizationMeta,
  ImageTrimMeta,
} from '../types';
import {
  IMAGE_TRIM_PARAMS,
  decideWhiteBorderTrim,
  trimRegionFromDecision,
  type ImageTrimDecision,
} from './trim-white-borders';

/**
 * Deterministic Houzez image optimization contract (v2).
 * v2 = v1 WebP params + conservative edge-fill trim before resize.
 */
export const IMAGE_OPTIMIZE_PIPELINE_VERSION = 'houzez-webp-v2' as const;

export const IMAGE_OPTIMIZE_PARAMS = {
  outputFormat: 'webp',
  contentType: 'image/webp' as const,
  extension: 'webp',
  quality: 82,
  /** Sharp WebP effort 0–6; fixed for determinism across runs. */
  effort: 4,
  maxWidth: 1600,
  maxHeight: 1200,
  resizeFit: 'inside' as const,
  withoutEnlargement: true,
  orientationPolicy: 'exif-autorotate',
  /**
   * Sharp strips EXIF/GPS/comments by default when encoding.
   * Color profile is not copied unless withMetadata() is used — we do not call it.
   */
  metadataPolicy: 'strip-all',
  /** Never force stored files to 16:9; presentation uses CSS object-cover. */
  storedAspectPolicy: 'natural-proportion',
  trim: IMAGE_TRIM_PARAMS,
} as const;

export type ImageOptimizeParams = typeof IMAGE_OPTIMIZE_PARAMS;

export type OptimizedImageResult = {
  body: Buffer;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  mimeType: 'image/webp';
  hasAlpha: boolean;
  orientationApplied: boolean;
  trim: ImageTrimDecision;
  source: {
    format: string | null;
    mimeType: string | null;
    width: number;
    height: number;
    bytes: number;
    sha256: string;
    hasAlpha: boolean;
  };
  params: ImageOptimizeParams;
  pipelineVersion: typeof IMAGE_OPTIMIZE_PIPELINE_VERSION;
};

export class ImageOptimizeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ImageOptimizeError';
  }
}

export function hashBufferSha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function mimeFromSharpFormat(format: string | undefined): string | null {
  if (!format) return null;
  if (format === 'jpeg' || format === 'jpg') return 'image/jpeg';
  if (format === 'png') return 'image/png';
  if (format === 'webp') return 'image/webp';
  if (format === 'gif') return 'image/gif';
  if (format === 'tiff') return 'image/tiff';
  if (format === 'avif') return 'image/avif';
  return `image/${format}`;
}

const SUPPORTED_INPUT_FORMATS = new Set([
  'jpeg',
  'jpg',
  'png',
  'webp',
  'tiff',
  'tif',
]);

function toTrimMeta(decision: ImageTrimDecision): ImageTrimMeta {
  return {
    trimApplied: decision.trimApplied,
    version: decision.version,
    originalWidth: decision.originalWidth,
    originalHeight: decision.originalHeight,
    trimmedWidth: decision.trimmedWidth,
    trimmedHeight: decision.trimmedHeight,
    pixelsRemoved: { ...decision.pixelsRemoved },
    confidence: decision.confidence,
    reason: decision.reason,
    nearWhiteMinChannel: decision.params.nearWhiteMinChannel,
    uniformityRatio: decision.params.uniformityRatio,
    minTrimPixels: decision.params.minTrimPixels,
    maxTrimRatioPerSide: decision.params.maxTrimRatioPerSide,
  };
}

/**
 * Deterministic WebP transform:
 * 1. Reject empty / undecodable / animated / unsupported
 * 2. Auto-orient via EXIF (`.rotate()`)
 * 3. Conservatively trim near-white edge fill (fail-closed)
 * 4. Fit inside 1600×1200 without enlargement or content crop
 * 5. Encode WebP quality 82 / effort 4
 * 6. Strip metadata (Sharp default when not calling withMetadata)
 *
 * Stored files keep natural aspect ratio — never padded to 16:9.
 */
export async function optimizeImageBuffer(
  input: Buffer,
  options?: { sourceMimeHint?: string | null },
): Promise<OptimizedImageResult> {
  if (!input || input.length === 0) {
    throw new ImageOptimizeError(
      'Empty image buffer rejected.',
      'IMAGE_EMPTY_SOURCE',
    );
  }

  const sourceSha256 = hashBufferSha256(input);
  const sourceBytes = input.length;

  let meta: sharp.Metadata;
  try {
    meta = await sharp(input, { failOn: 'error', animated: true }).metadata();
  } catch (error) {
    throw new ImageOptimizeError(
      `Undecodable image: ${error instanceof Error ? error.message : String(error)}`,
      'IMAGE_UNDECODABLE',
    );
  }

  const format = (meta.format ?? '').toLowerCase();
  if (!format || !SUPPORTED_INPUT_FORMATS.has(format)) {
    throw new ImageOptimizeError(
      `Unsupported image format "${format || 'unknown'}".`,
      'IMAGE_UNSUPPORTED_FORMAT',
      { format },
    );
  }

  if ((meta.pages ?? 1) > 1) {
    throw new ImageOptimizeError(
      'Animated images are not supported by the Houzez WebP pipeline.',
      'IMAGE_ANIMATED_REJECTED',
      { pages: meta.pages, format },
    );
  }

  const orientationApplied = meta.orientation != null && meta.orientation !== 1;
  const sourceHasAlpha = Boolean(meta.hasAlpha);
  const sourceWidth = meta.width ?? 0;
  const sourceHeight = meta.height ?? 0;
  if (sourceWidth < 1 || sourceHeight < 1) {
    throw new ImageOptimizeError(
      'Source image has invalid dimensions.',
      'IMAGE_INVALID_SOURCE_DIMENSIONS',
      { width: sourceWidth, height: sourceHeight },
    );
  }

  let body: Buffer;
  let outMeta: sharp.OutputInfo;
  let trimDecision: ImageTrimDecision;
  try {
    // Orient first so trim operates on upright pixels.
    const oriented = await sharp(input, { failOn: 'error' })
      .rotate()
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    trimDecision = decideWhiteBorderTrim({
      data: oriented.data,
      width: oriented.info.width,
      height: oriented.info.height,
      channels: oriented.info.channels,
    });

    const region = trimRegionFromDecision(trimDecision);
    let working = sharp(oriented.data, {
      failOn: 'error',
      raw: {
        width: oriented.info.width,
        height: oriented.info.height,
        channels: oriented.info.channels,
      },
    });
    if (region) {
      working = working.extract(region);
    }

    const result = await working
      .resize({
        width: IMAGE_OPTIMIZE_PARAMS.maxWidth,
        height: IMAGE_OPTIMIZE_PARAMS.maxHeight,
        fit: IMAGE_OPTIMIZE_PARAMS.resizeFit,
        withoutEnlargement: IMAGE_OPTIMIZE_PARAMS.withoutEnlargement,
      })
      .webp({
        quality: IMAGE_OPTIMIZE_PARAMS.quality,
        effort: IMAGE_OPTIMIZE_PARAMS.effort,
      })
      .toBuffer({ resolveWithObject: true });
    body = result.data;
    outMeta = result.info;
  } catch (error) {
    if (error instanceof ImageOptimizeError) throw error;
    throw new ImageOptimizeError(
      `Image transform failed: ${error instanceof Error ? error.message : String(error)}`,
      'IMAGE_TRANSFORM_FAILED',
    );
  }

  if (!body || body.length === 0) {
    throw new ImageOptimizeError(
      'Optimized image result is empty.',
      'IMAGE_EMPTY_OUTPUT',
    );
  }

  const width = outMeta.width ?? 0;
  const height = outMeta.height ?? 0;
  if (width < 1 || height < 1) {
    throw new ImageOptimizeError(
      'Optimized image has invalid dimensions.',
      'IMAGE_INVALID_OUTPUT_DIMENSIONS',
      { width, height },
    );
  }
  if (
    width > IMAGE_OPTIMIZE_PARAMS.maxWidth ||
    height > IMAGE_OPTIMIZE_PARAMS.maxHeight
  ) {
    throw new ImageOptimizeError(
      'Optimized image exceeds max box.',
      'IMAGE_OUTPUT_EXCEEDS_MAX',
      { width, height },
    );
  }

  if (outMeta.format !== 'webp') {
    throw new ImageOptimizeError(
      `Expected webp output, got ${outMeta.format}.`,
      'IMAGE_OUTPUT_MIME_MISMATCH',
    );
  }

  const outInspect = await sharp(body, { failOn: 'error' }).metadata();
  const hasAlpha = Boolean(outInspect.hasAlpha);

  return {
    body,
    width,
    height,
    bytes: body.length,
    sha256: hashBufferSha256(body),
    mimeType: IMAGE_OPTIMIZE_PARAMS.contentType,
    hasAlpha,
    orientationApplied,
    trim: trimDecision!,
    source: {
      format: format || null,
      mimeType: options?.sourceMimeHint ?? mimeFromSharpFormat(format) ?? null,
      width: sourceWidth,
      height: sourceHeight,
      bytes: sourceBytes,
      sha256: sourceSha256,
      hasAlpha: sourceHasAlpha,
    },
    params: IMAGE_OPTIMIZE_PARAMS,
    pipelineVersion: IMAGE_OPTIMIZE_PIPELINE_VERSION,
  };
}

export async function optimizeImageFile(
  absolutePath: string,
  options?: { sourceMimeHint?: string | null },
): Promise<OptimizedImageResult> {
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    throw new ImageOptimizeError(
      'Source image path missing.',
      'IMAGE_SOURCE_MISSING',
      { absolutePath },
    );
  }
  const buf = fs.readFileSync(absolutePath);
  return optimizeImageBuffer(buf, options);
}

export function buildOptimizationMeta(input: {
  result: OptimizedImageResult;
  attachmentId: number;
  sortOrder: number;
  isCover: boolean;
  storageKey: string;
  outputFilename: string;
}): ImageOptimizationMeta {
  const { result } = input;
  return {
    pipelineVersion: result.pipelineVersion,
    quality: result.params.quality,
    maxWidth: result.params.maxWidth,
    maxHeight: result.params.maxHeight,
    resizeFit: result.params.resizeFit,
    withoutEnlargement: result.params.withoutEnlargement,
    orientationPolicy: result.params.orientationPolicy,
    metadataPolicy: result.params.metadataPolicy,
    orientationApplied: result.orientationApplied,
    trim: toTrimMeta(result.trim),
    source: {
      mimeType: result.source.mimeType,
      format: result.source.format,
      width: result.source.width,
      height: result.source.height,
      bytes: result.source.bytes,
      sha256: result.source.sha256,
      hasAlpha: result.source.hasAlpha,
    },
    output: {
      filename: input.outputFilename,
      mimeType: result.mimeType,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      sha256: result.sha256,
      hasAlpha: result.hasAlpha,
      storageKey: input.storageKey,
    },
  };
}

/**
 * Apply the shared WebP pipeline to a gallery plan.
 * Mutates plan fields so dry-run / import / local prep share one contract:
 * - sha256 / mimeType / dimensions / fileSizeBytes / proposedFilename reflect OUTPUT
 * - sourceSha256 + optimization.source preserve original integrity
 */
export async function applyImageOptimizationPlan(input: {
  images: ImagePlanEntry[];
  tenantId: string;
  sourceId: string;
}): Promise<{
  images: ImagePlanEntry[];
  optimizedBodies: Map<number, Buffer>;
}> {
  const images: ImagePlanEntry[] = [];
  const optimizedBodies = new Map<number, Buffer>();

  for (const image of input.images) {
    if (!image.exists || !image.absolutePath) {
      throw new ImageOptimizeError(
        `Cannot optimize missing original for attachment ${image.attachmentId}.`,
        'IMAGE_SOURCE_MISSING',
        { attachmentId: image.attachmentId },
      );
    }

    const result = await optimizeImageFile(image.absolutePath, {
      sourceMimeHint: image.mimeType,
    });

    const outputFilename = `${String(image.sortOrder).padStart(2, '0')}-wp${image.attachmentId}.webp`;
    const storageKey = buildHouzezMigrationImageKey({
      tenantId: input.tenantId,
      sourceId: input.sourceId,
      sortOrder: image.sortOrder,
      attachmentId: image.attachmentId,
      extension: IMAGE_OPTIMIZE_PARAMS.extension,
    });

    const optimization = buildOptimizationMeta({
      result,
      attachmentId: image.attachmentId,
      sortOrder: image.sortOrder,
      isCover: image.isCover,
      storageKey,
      outputFilename,
    });

    optimizedBodies.set(image.attachmentId, result.body);

    images.push({
      ...image,
      mimeType: IMAGE_OPTIMIZE_PARAMS.contentType,
      width: result.width,
      height: result.height,
      fileSizeBytes: result.bytes,
      sourceSha256: result.source.sha256,
      sha256: result.sha256,
      proposedFilename: outputFilename,
      proposedStorageKeyPattern: storageKey,
      optimization,
    });
  }

  return { images, optimizedBodies };
}

export function assertOptimizedPlanMatchesApproved(input: {
  live: ImagePlanEntry[];
  approved: ImagePlanEntry[];
}): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (input.live.length !== input.approved.length) {
    errors.push(
      `Optimized image count mismatch: live=${input.live.length} approved=${input.approved.length}.`,
    );
  }
  const n = Math.min(input.live.length, input.approved.length);
  for (let i = 0; i < n; i++) {
    const live = input.live[i];
    const approved = input.approved[i];
    const label = `image[${i}] attachment=${live.attachmentId}`;
    if (live.attachmentId !== approved.attachmentId) {
      errors.push(`${label}: attachmentId changed.`);
    }
    if (live.sortOrder !== approved.sortOrder) {
      errors.push(`${label}: sortOrder changed.`);
    }
    if (live.isCover !== approved.isCover) {
      errors.push(`${label}: cover flag changed.`);
    }
    if (live.sha256 !== approved.sha256) {
      errors.push(`${label}: output sha256 mismatch.`);
    }
    if ((live.sourceSha256 ?? null) !== (approved.sourceSha256 ?? null)) {
      errors.push(`${label}: source sha256 mismatch.`);
    }
    if (live.proposedFilename !== approved.proposedFilename) {
      errors.push(`${label}: filename mismatch.`);
    }
    if (live.mimeType !== approved.mimeType) {
      errors.push(`${label}: mimeType mismatch.`);
    }
    if (live.proposedStorageKeyPattern !== approved.proposedStorageKeyPattern) {
      errors.push(`${label}: storage key mismatch.`);
    }
    if (live.fileSizeBytes !== approved.fileSizeBytes) {
      errors.push(`${label}: bytes mismatch.`);
    }
    if (live.width !== approved.width || live.height !== approved.height) {
      errors.push(`${label}: dimensions mismatch.`);
    }
    const lq = live.optimization?.quality;
    const aq = approved.optimization?.quality;
    if (lq != null && aq != null && lq !== aq) {
      errors.push(`${label}: quality parameter mismatch.`);
    }
    const lw = live.optimization?.maxWidth;
    const aw = approved.optimization?.maxWidth;
    if (
      lw != null &&
      aw != null &&
      (lw !== aw ||
        live.optimization?.maxHeight !== approved.optimization?.maxHeight)
    ) {
      errors.push(`${label}: max dimension parameters mismatch.`);
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}
