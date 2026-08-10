import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  IMAGE_OPTIMIZE_PIPELINE_VERSION,
  IMAGE_OPTIMIZE_PARAMS,
  applyImageOptimizationPlan,
} from './optimize-pipeline';
import { buildGalleryPlan } from './gallery-plan';
import type { WordpressAttachmentRaw, WordpressPropertyRaw } from '../types';
import {
  DEFAULT_OWNER_EMAIL,
  DEFAULT_TENANT_SLUG,
  PILOT_WP_ID,
} from '../constants';

export type LocalPreparationManifest = {
  status: 'prepared_local_only_not_uploaded_not_imported';
  wpId: number;
  tenant: string;
  owner: string;
  tenantId: string;
  preparedAt: string;
  outputDir: string;
  dryRunReportPath: string | null;
  fingerprint: string | null;
  pipelineVersion: typeof IMAGE_OPTIMIZE_PIPELINE_VERSION;
  params: typeof IMAGE_OPTIMIZE_PARAMS;
  imageCount: number;
  images: Array<{
    sortOrder: number;
    attachmentId: number;
    isCover: boolean;
    sourcePath: string | null;
    sourceSha256: string;
    sourceFormat: string | null;
    sourceMimeType: string | null;
    sourceWidth: number | null;
    sourceHeight: number | null;
    sourceBytes: number;
    sourceHasAlpha: boolean;
    outputPath: string;
    outputFilename: string;
    outputSha256: string;
    outputWidth: number;
    outputHeight: number;
    outputBytes: number;
    outputMimeType: 'image/webp';
    outputHasAlpha: boolean;
    reductionPercent: number;
    storageKey: string;
    orientationApplied: boolean;
  }>;
};

export async function prepareOptimizedImagesLocally(input: {
  property: WordpressPropertyRaw;
  attachments: Map<number, WordpressAttachmentRaw>;
  uploadsDir: string;
  outputRoot: string;
  tenantId: string;
  tenantSlug?: string;
  ownerEmail?: string;
  sourceId?: string;
  dryRunReportPath?: string | null;
  fingerprint?: string | null;
  /** Informative only — must not affect functional hashes. */
  preparedAt?: string;
}): Promise<LocalPreparationManifest> {
  const wpId = input.property.id;
  const sourceId = input.sourceId ?? String(wpId);
  const preparedAt = input.preparedAt ?? new Date().toISOString();
  const stamp = preparedAt.replace(/[:.]/g, '-').replace(/Z$/, 'Z');
  const outputDir = path.join(input.outputRoot, `wp-${wpId}`, stamp);
  const imagesDir = path.join(outputDir, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });

  const gallery = buildGalleryPlan({
    property: input.property,
    attachments: input.attachments,
    uploadsDir: input.uploadsDir,
    tenantIdPlaceholder: input.tenantId,
    computeHash: true,
  });
  if (gallery.blockers.length) {
    throw new Error(
      gallery.blockers.map((b) => `${b.code}: ${b.message}`).join('; '),
    );
  }

  const { images, optimizedBodies } = await applyImageOptimizationPlan({
    images: gallery.images,
    tenantId: input.tenantId,
    sourceId,
  });

  const manifestImages: LocalPreparationManifest['images'] = [];
  for (const image of images) {
    const body = optimizedBodies.get(image.attachmentId);
    if (!body || !image.optimization) {
      throw new Error(`Missing optimized body for ${image.attachmentId}`);
    }
    const outputPath = path.join(imagesDir, image.proposedFilename);
    fs.writeFileSync(outputPath, body);
    const sourceBytes = image.optimization.source.bytes;
    const outputBytes = image.optimization.output.bytes;
    const reductionPercent =
      sourceBytes > 0
        ? Number((((sourceBytes - outputBytes) / sourceBytes) * 100).toFixed(2))
        : 0;
    manifestImages.push({
      sortOrder: image.sortOrder,
      attachmentId: image.attachmentId,
      isCover: image.isCover,
      sourcePath: image.relativePath,
      sourceSha256: image.optimization.source.sha256,
      sourceFormat: image.optimization.source.format,
      sourceMimeType: image.optimization.source.mimeType,
      sourceWidth: image.optimization.source.width,
      sourceHeight: image.optimization.source.height,
      sourceBytes,
      sourceHasAlpha: image.optimization.source.hasAlpha,
      outputPath: path.relative(outputDir, outputPath).replace(/\\/g, '/'),
      outputFilename: image.proposedFilename,
      outputSha256: image.optimization.output.sha256,
      outputWidth: image.optimization.output.width,
      outputHeight: image.optimization.output.height,
      outputBytes,
      outputMimeType: 'image/webp',
      outputHasAlpha: image.optimization.output.hasAlpha,
      reductionPercent,
      storageKey: image.optimization.output.storageKey,
      orientationApplied: image.optimization.orientationApplied,
    });
  }

  const manifest: LocalPreparationManifest = {
    status: 'prepared_local_only_not_uploaded_not_imported',
    wpId,
    tenant: input.tenantSlug ?? DEFAULT_TENANT_SLUG,
    owner: input.ownerEmail ?? DEFAULT_OWNER_EMAIL,
    tenantId: input.tenantId,
    preparedAt,
    outputDir,
    dryRunReportPath: input.dryRunReportPath ?? null,
    fingerprint: input.fingerprint ?? null,
    pipelineVersion: IMAGE_OPTIMIZE_PIPELINE_VERSION,
    params: IMAGE_OPTIMIZE_PARAMS,
    imageCount: manifestImages.length,
    images: manifestImages,
  };

  fs.writeFileSync(
    path.join(outputDir, 'preparation-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8',
  );

  return manifest;
}

/** Convenience for the WP 5312 pilot — refuses other wp ids. */
export async function preparePilot5312ImagesLocally(input: {
  property: WordpressPropertyRaw;
  attachments: Map<number, WordpressAttachmentRaw>;
  uploadsDir: string;
  outputRoot: string;
  tenantId: string;
  dryRunReportPath?: string | null;
  fingerprint?: string | null;
  preparedAt?: string;
}): Promise<LocalPreparationManifest> {
  if (input.property.id !== PILOT_WP_ID) {
    throw new Error(
      `preparePilot5312ImagesLocally only accepts WP ${PILOT_WP_ID}.`,
    );
  }
  return prepareOptimizedImagesLocally(input);
}
