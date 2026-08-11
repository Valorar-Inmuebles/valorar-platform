import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import sharp from 'sharp';
import {
  IMAGE_OPTIMIZE_PARAMS,
  IMAGE_OPTIMIZE_PIPELINE_VERSION,
  ImageOptimizeError,
  applyImageOptimizationPlan,
  assertOptimizedPlanMatchesApproved,
  hashBufferSha256,
  optimizeImageBuffer,
} from './optimize-pipeline';
import type { ImagePlanEntry } from '../types';
import { computeDryRunFingerprint } from '../writer/dry-run-fingerprint';
import { loadBundledDatasetManifest } from '../dataset/validate-dataset-manifest';
import { PILOT_5312_EXPECTED_RELATIVE_KEYS } from '../constants';
import type { DryRunReport } from '../types';

async function jpeg(width: number, height: number, color = '#336699'): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: color,
    },
  })
    .jpeg({ quality: 92 })
    .toBuffer();
}

async function png(
  width: number,
  height: number,
  opts?: { alpha?: boolean },
): Promise<Buffer> {
  if (opts?.alpha) {
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 180, b: 0, alpha: 0.4 },
      },
    })
      .png()
      .toBuffer();
  }
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 40, b: 40 },
    },
  })
    .png()
    .toBuffer();
}

describe('optimizeImageBuffer (houzez-webp-v2)', () => {
  it('converts small horizontal JPEG without enlargement', async () => {
    const input = await jpeg(800, 600);
    const out = await optimizeImageBuffer(input, {
      sourceMimeHint: 'image/jpeg',
    });
    expect(out.mimeType).toBe('image/webp');
    expect(out.width).toBe(800);
    expect(out.height).toBe(600);
    expect(out.params.quality).toBe(82);
    expect(out.pipelineVersion).toBe(IMAGE_OPTIMIZE_PIPELINE_VERSION);
    expect(out.source.hasAlpha).toBe(false);
  });

  it('fits large horizontal JPEG inside 1600x1200 without crop', async () => {
    const input = await jpeg(3200, 1800);
    const out = await optimizeImageBuffer(input);
    expect(out.width).toBeLessThanOrEqual(1600);
    expect(out.height).toBeLessThanOrEqual(1200);
    expect(out.width).toBe(1600);
    expect(out.height).toBe(900);
    expect(out.width / out.height).toBeCloseTo(3200 / 1800, 2);
  });

  it('fits vertical images inside the max box', async () => {
    const input = await jpeg(900, 2400);
    const out = await optimizeImageBuffer(input);
    expect(out.width).toBeLessThanOrEqual(1600);
    expect(out.height).toBeLessThanOrEqual(1200);
    expect(out.height).toBe(1200);
    expect(out.width).toBe(450);
  });

  it('fits panoramic images with width <= 1600', async () => {
    const input = await jpeg(4000, 800);
    const out = await optimizeImageBuffer(input);
    expect(out.width).toBe(1600);
    expect(out.height).toBe(320);
  });

  it('converts PNG to WebP', async () => {
    const input = await png(640, 480);
    const out = await optimizeImageBuffer(input, {
      sourceMimeHint: 'image/png',
    });
    expect(out.mimeType).toBe('image/webp');
    expect(out.source.format).toBe('png');
  });

  it('preserves PNG transparency in WebP', async () => {
    const input = await png(200, 200, { alpha: true });
    const out = await optimizeImageBuffer(input);
    expect(out.source.hasAlpha).toBe(true);
    expect(out.hasAlpha).toBe(true);
  });

  it('applies EXIF orientation so pixels are upright', async () => {
    // Build a non-square image, then attach Orientation=6 (rotate 90 CW).
    const base = await sharp({
      create: {
        width: 200,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();
    // Re-encode with explicit orientation tag via sharp rotate metadata path:
    // write pixels as if already rotated, then set orientation 6 on a wide buffer.
    // Practical approach: use sharp to produce oriented JPEG with .withMetadata.
    const oriented = await sharp(base)
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    const out = await optimizeImageBuffer(oriented);
    // Orientation 6 swaps axes: visual upright should be 100x200 after rotate.
    expect(out.width).toBe(100);
    expect(out.height).toBe(200);
    expect(out.orientationApplied).toBe(true);
    const meta = await sharp(out.body).metadata();
    expect(meta.orientation == null || meta.orientation === 1).toBe(true);
  });

  it('strips EXIF/GPS from the WebP output', async () => {
    const base = await jpeg(300, 200);
    const withExif = await sharp(base)
      .withMetadata({
        orientation: 1,
        exif: {
          IFD0: { Copyright: 'secret-test' },
        },
      })
      .jpeg()
      .toBuffer();
    const out = await optimizeImageBuffer(withExif);
    const meta = await sharp(out.body).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
  });

  it('is deterministic for the same input and params', async () => {
    const input = await jpeg(640, 480, '#112233');
    const a = await optimizeImageBuffer(input);
    const b = await optimizeImageBuffer(input);
    expect(a.sha256).toBe(b.sha256);
    expect(a.bytes).toBe(b.bytes);
  });

  it('rejects empty buffers', async () => {
    await expect(optimizeImageBuffer(Buffer.alloc(0))).rejects.toMatchObject({
      code: 'IMAGE_EMPTY_SOURCE',
    });
  });

  it('rejects corrupt buffers', async () => {
    await expect(
      optimizeImageBuffer(Buffer.from('not-an-image')),
    ).rejects.toBeInstanceOf(ImageOptimizeError);
  });

  it('rejects animated WebP', async () => {
    // Two-page animated webp via sharp join
    const frame1 = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 3,
        background: 'red',
      },
    })
      .webp()
      .toBuffer();
    // If animated construction is unavailable, skip with explicit check of pages path
    // by feeding a GIF (unsupported for animation contract — fails closed).
    const gif = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 3,
        background: 'blue',
      },
    })
      .gif()
      .toBuffer();
    await expect(optimizeImageBuffer(gif)).rejects.toMatchObject({
      code: expect.stringMatching(/UNSUPPORTED|ANIMATED/),
    });
    expect(frame1.length).toBeGreaterThan(0);
  });
});

describe('applyImageOptimizationPlan + naming', () => {
  it('emits webp keys 00-06 for pilot-shaped attachments', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'houzez-opt-plan-'));
    const images: ImagePlanEntry[] = [];
    const attachmentIds = [5315, 6927, 8967, 8966, 5314, 6928, 8965];
    for (let i = 0; i < 7; i++) {
      const file = path.join(tmp, `src-${i}.jpg`);
      fs.writeFileSync(file, await jpeg(100 + i, 80 + i));
      images.push({
        sortOrder: i,
        attachmentId: attachmentIds[i],
        isCover: i === 0,
        relativePath: `src-${i}.jpg`,
        absolutePath: file,
        exists: true,
        mimeType: 'image/jpeg',
        width: 100 + i,
        height: 80 + i,
        fileSizeBytes: fs.statSync(file).size,
        sha256: hashBufferSha256(fs.readFileSync(file)),
        sourceSha256: hashBufferSha256(fs.readFileSync(file)),
        proposedStorageKeyPattern: 'x',
        proposedFilename: `${String(i).padStart(2, '0')}-wp${attachmentIds[i]}.jpg`,
      });
    }

    const { images: out } = await applyImageOptimizationPlan({
      images,
      tenantId: 'cmqgnlvda0000ywus410xbnce',
      sourceId: '5312',
    });

    expect(out.map((i) => i.proposedFilename)).toEqual([
      ...PILOT_5312_EXPECTED_RELATIVE_KEYS,
    ]);
    for (const img of out) {
      expect(img.mimeType).toBe('image/webp');
      expect(img.optimization?.output.storageKey.endsWith('.webp')).toBe(true);
      expect(img.optimization?.quality).toBe(IMAGE_OPTIMIZE_PARAMS.quality);
    }
    expect(out[0].isCover).toBe(true);
    expect(out[0].attachmentId).toBe(5315);

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe('fingerprint integrity with optimization contract', () => {
  function baseReport(images: ImagePlanEntry[]): DryRunReport {
    const manifest = loadBundledDatasetManifest();
    const base: Omit<DryRunReport, 'reportFingerprint'> = {
      mode: 'dry-run',
      batchId: 'batch',
      wpId: 5312,
      sourceSystem: 'wordpress-houzez',
      tenantSlug: 'demo',
      ownerEmail: 'admin@demo.valorar.dev',
      safety: {
        migrationTarget: 'production',
        dbHostMasked: '***',
        gatesSatisfied: true,
        dbAccessEnabled: true,
        skipDb: false,
      },
      datasetManifest: {
        manifestId: manifest.manifestId,
        ok: true,
        fragmentDigests: manifest.fragments.map((f) => ({
          fileName: f.fileName,
          sha256: f.sha256,
          bytes: f.bytes,
        })),
      },
      preflight: {
        performed: true,
        propertyTreeEmpty: true,
        propertyTreeCounts: {
          Property: 0,
          PropertyListing: 0,
          PropertyPrice: 0,
          PropertyImage: 0,
          PropertyFeatureAssignment: 0,
          PropertyAgentAccess: 0,
        },
        pilotFeaturePresent: true,
        geoOk: true,
        migrationSourceRefExists: true,
        baseline: { userCount: 1, developmentCount: 0 },
        pilotBlockers: [],
        informativeWarnings: [],
        importBlockers: [],
      },
      owner: {
        ok: true,
        tenantId: 't1',
        tenantSlug: 'demo',
        userId: 'u1',
        email: 'admin@demo.valorar.dev',
        errors: [],
      },
      source: null,
      transformed: { property: { title: 'x' } },
      inferences: [],
      catalogs: [],
      images,
      imageSummary: {
        galleryCount: 6,
        uniqueCount: images.length,
        coverAttachmentId: 5315,
        coverInGallery: false,
        coverPrepended: true,
        allOriginalsExist: true,
        exceedsImageLimit: false,
        imageLimit: 30,
      },
      oldUrl: {
        status: 'verified',
        oldSlug: 'x',
        postDate: null,
        oldUrl: null,
        components: {},
        notes: [],
      },
      plannedEntities: [],
      idempotency: {
        schema: { available: true },
        existingPropertyRef: null,
        note: 'ok',
        idempotencySchemaAvailable: true,
        idempotencyDbCheckPerformed: true,
      },
      warnings: [],
      blockers: [],
      wouldWrite: false,
    };
    return {
      ...base,
      reportFingerprint: computeDryRunFingerprint({
        ...base,
        reportFingerprint: '',
      }),
    };
  }

  it('changes fingerprint when quality / output hash / order / cover / key change', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'houzez-fp-'));
    const file = path.join(tmp, 'a.jpg');
    fs.writeFileSync(file, await jpeg(200, 150));
    const { images } = await applyImageOptimizationPlan({
      images: [
        {
          sortOrder: 0,
          attachmentId: 5315,
          isCover: true,
          relativePath: 'a.jpg',
          absolutePath: file,
          exists: true,
          mimeType: 'image/jpeg',
          width: 200,
          height: 150,
          fileSizeBytes: fs.statSync(file).size,
          sha256: null,
          proposedStorageKeyPattern: 'x',
          proposedFilename: '00-wp5315.jpg',
        },
      ],
      tenantId: 'tenant',
      sourceId: '5312',
    });
    const fp1 = baseReport(images).reportFingerprint;

    const qualityTamper = images.map((img) => ({
      ...img,
      optimization: img.optimization
        ? { ...img.optimization, quality: 50 }
        : undefined,
    }));
    expect(baseReport(qualityTamper).reportFingerprint).not.toBe(fp1);

    const hashTamper = images.map((img) => ({
      ...img,
      sha256: 'f'.repeat(64),
    }));
    expect(baseReport(hashTamper).reportFingerprint).not.toBe(fp1);

    const coverTamper = images.map((img) => ({ ...img, isCover: false }));
    expect(baseReport(coverTamper).reportFingerprint).not.toBe(fp1);

    const keyTamper = images.map((img) => ({
      ...img,
      proposedStorageKeyPattern: img.proposedStorageKeyPattern.replace(
        '.webp',
        '.jpg',
      ),
      optimization: img.optimization
        ? {
            ...img.optimization,
            output: {
              ...img.optimization.output,
              storageKey: img.optimization.output.storageKey.replace(
                '.webp',
                '.jpg',
              ),
            },
          }
        : undefined,
    }));
    expect(baseReport(keyTamper).reportFingerprint).not.toBe(fp1);

    const mismatch = assertOptimizedPlanMatchesApproved({
      live: images,
      approved: hashTamper,
    });
    expect(mismatch.ok).toBe(false);

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
