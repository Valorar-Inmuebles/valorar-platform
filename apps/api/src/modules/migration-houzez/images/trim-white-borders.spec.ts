import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';
import { decideWhiteBorderTrim, IMAGE_TRIM_PARAMS } from './trim-white-borders';
import { optimizeImageBuffer } from './optimize-pipeline';

function rawRgba(
  width: number,
  height: number,
  paint: (
    x: number,
    y: number,
  ) => {
    r: number;
    g: number;
    b: number;
    a?: number;
  },
): { data: Buffer; width: number; height: number; channels: 4 } {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = paint(x, y);
      const i = (y * width + x) * 4;
      data[i] = p.r;
      data[i + 1] = p.g;
      data[i + 2] = p.b;
      data[i + 3] = p.a ?? 255;
    }
  }
  return { data, width, height, channels: 4 };
}

async function jpegWithBands(input: {
  width: number;
  height: number;
  content: { r: number; g: number; b: number };
  bands: { top?: number; bottom?: number; left?: number; right?: number };
  bandColor?: { r: number; g: number; b: number };
}): Promise<Buffer> {
  const band = input.bandColor ?? { r: 255, g: 255, b: 255 };
  const width = input.width;
  const height = input.height;
  const { data } = rawRgba(width, height, (x, y) => {
    const top = input.bands.top ?? 0;
    const bottom = input.bands.bottom ?? 0;
    const left = input.bands.left ?? 0;
    const right = input.bands.right ?? 0;
    if (y < top || y >= height - bottom || x < left || x >= width - right) {
      return band;
    }
    return input.content;
  });
  return sharp(data, {
    raw: { width, height, channels: 4 },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
}

describe('decideWhiteBorderTrim (edge-fill-v1)', () => {
  it('1. trims a white top band', () => {
    const raw = rawRgba(200, 120, (_x, y) =>
      y < 20 ? { r: 255, g: 255, b: 255 } : { r: 40, g: 90, b: 160 },
    );
    const d = decideWhiteBorderTrim(raw);
    expect(d.trimApplied).toBe(true);
    expect(d.pixelsRemoved.top).toBe(20);
    expect(d.pixelsRemoved.bottom).toBe(0);
    expect(d.trimmedHeight).toBe(100);
  });

  it('2. trims white top and bottom bands', () => {
    const raw = rawRgba(200, 160, (_x, y) =>
      y < 16 || y >= 144 ? { r: 255, g: 255, b: 255 } : { r: 30, g: 30, b: 30 },
    );
    const d = decideWhiteBorderTrim(raw);
    expect(d.trimApplied).toBe(true);
    expect(d.pixelsRemoved.top).toBe(16);
    expect(d.pixelsRemoved.bottom).toBe(16);
    expect(d.trimmedHeight).toBe(128);
  });

  it('3. trims all four sides', () => {
    const raw = rawRgba(220, 180, (x, y) => {
      if (y < 12 || y >= 168 || x < 10 || x >= 210) {
        return { r: 255, g: 255, b: 255 };
      }
      return { r: 10, g: 120, b: 40 };
    });
    const d = decideWhiteBorderTrim(raw);
    expect(d.trimApplied).toBe(true);
    expect(d.pixelsRemoved).toEqual({
      top: 12,
      bottom: 12,
      left: 10,
      right: 10,
    });
  });

  it('4. accepts slightly gray near-white fill', () => {
    const raw = rawRgba(180, 120, (_x, y) =>
      y < 14 ? { r: 247, g: 247, b: 247 } : { r: 80, g: 40, b: 20 },
    );
    const d = decideWhiteBorderTrim(raw);
    expect(d.trimApplied).toBe(true);
    expect(d.pixelsRemoved.top).toBe(14);
  });

  it('5. does not trim an image without fill', () => {
    const raw = rawRgba(160, 100, () => ({ r: 60, g: 90, b: 130 }));
    const d = decideWhiteBorderTrim(raw);
    expect(d.trimApplied).toBe(false);
    expect(d.pixelsRemoved).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  it('6. does not trim a real white wall touching one edge', () => {
    const raw = rawRgba(200, 120, (x) =>
      x < 80 ? { r: 252, g: 252, b: 252 } : { r: 90, g: 70, b: 50 },
    );
    const d = decideWhiteBorderTrim(raw);
    expect(d.trimApplied).toBe(false);
  });

  it('7. does not trim a bright sky gradient at the top', () => {
    const raw = rawRgba(200, 140, (_x, y) => {
      const t = Math.max(0, 255 - y * 3);
      return { r: t, g: t, b: Math.min(255, t + 10) };
    });
    const d = decideWhiteBorderTrim(raw);
    expect(d.trimApplied).toBe(false);
  });

  it('8. supports vertical images', () => {
    const raw = rawRgba(100, 220, (_x, y) =>
      y < 18 || y >= 202
        ? { r: 255, g: 255, b: 255 }
        : { r: 20, g: 140, b: 80 },
    );
    const d = decideWhiteBorderTrim(raw);
    expect(d.trimApplied).toBe(true);
    expect(d.originalWidth).toBe(100);
    expect(d.originalHeight).toBe(220);
    expect(d.trimmedHeight).toBe(184);
  });

  it('9. supports horizontal images', () => {
    const raw = rawRgba(240, 100, (x) =>
      x < 16 || x >= 224
        ? { r: 255, g: 255, b: 255 }
        : { r: 180, g: 40, b: 40 },
    );
    const d = decideWhiteBorderTrim(raw);
    expect(d.trimApplied).toBe(true);
    expect(d.trimmedWidth).toBe(208);
  });

  it('10. ignores transparent (non-opaque) edge pixels as fill', () => {
    const raw = rawRgba(160, 100, (_x, y) =>
      y < 20
        ? { r: 255, g: 255, b: 255, a: 0 }
        : { r: 40, g: 40, b: 40, a: 255 },
    );
    const d = decideWhiteBorderTrim(raw);
    expect(d.trimApplied).toBe(false);
  });

  it('11. refuses oversized / ambiguous borders (fail-closed)', () => {
    const max = Math.floor(200 * IMAGE_TRIM_PARAMS.maxTrimRatioPerSide);
    const raw = rawRgba(200, 200, (_x, y) =>
      y < max + 5 ? { r: 255, g: 255, b: 255 } : { r: 10, g: 10, b: 10 },
    );
    const d = decideWhiteBorderTrim(raw);
    expect(d.trimApplied).toBe(false);
    expect(d.reason).toMatch(/top_exceeds_max_ratio|top_ambiguous/);
  });

  it('12. refuses nearly completely white images', () => {
    const raw = rawRgba(120, 120, (x, y) =>
      x > 110 && y > 110 ? { r: 10, g: 10, b: 10 } : { r: 255, g: 255, b: 255 },
    );
    const d = decideWhiteBorderTrim(raw);
    expect(d.trimApplied).toBe(false);
  });
});

describe('optimizeImageBuffer trim integration', () => {
  it('13. is deterministic for trimmed output hashes', async () => {
    const input = await jpegWithBands({
      width: 400,
      height: 300,
      content: { r: 30, g: 90, b: 150 },
      bands: { top: 24, bottom: 24 },
    });
    const a = await optimizeImageBuffer(input);
    const b = await optimizeImageBuffer(input);
    expect(a.trim.trimApplied).toBe(true);
    expect(a.sha256).toBe(b.sha256);
    expect(a.width).toBe(a.trim.trimmedWidth);
    expect(a.height).toBe(a.trim.trimmedHeight);
  });

  it('14. WP 5312 cover source has real letterbox and is trimmed', async () => {
    const cover = path.resolve(
      __dirname,
      '../../../../../../migration-data/uploads/2018/02/003.jpg',
    );
    if (!fs.existsSync(cover)) {
      return;
    }
    const buf = fs.readFileSync(cover);
    const out = await optimizeImageBuffer(buf, {
      sourceMimeHint: 'image/jpeg',
    });
    expect(out.trim.trimApplied).toBe(true);
    expect(out.trim.pixelsRemoved.top).toBeGreaterThanOrEqual(8);
    expect(out.trim.pixelsRemoved.bottom).toBeGreaterThanOrEqual(8);
    expect(out.trim.originalHeight).toBe(768);
    expect(out.height).toBeLessThan(768);
    expect(out.mimeType).toBe('image/webp');
    expect(out.width / out.height).toBeCloseTo(
      out.trim.trimmedWidth / out.trim.trimmedHeight,
      5,
    );
  });

  it('preserves alpha-capable PNG content without inventing white padding', async () => {
    const png = await sharp({
      create: {
        width: 120,
        height: 80,
        channels: 4,
        background: { r: 0, g: 180, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();
    const out = await optimizeImageBuffer(png);
    expect(out.trim.trimApplied).toBe(false);
    expect(out.width).toBe(120);
    expect(out.height).toBe(80);
  });
});
