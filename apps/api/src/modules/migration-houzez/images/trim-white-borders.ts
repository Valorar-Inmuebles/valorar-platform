/**
 * Conservative edge-fill trim for Houzez migration images.
 *
 * Fail-closed rules:
 * - Only trims contiguous bands connected to the outer frame.
 * - Each side is evaluated independently.
 * - Near-white tolerance is documented and fixed (determinism).
 * - Requires high row/column uniformity and a clear content transition.
 * - Refuses oversized, ambiguous, or near-blank results (keeps original).
 * - Never pads, never forces 16:9, never distorts.
 */

export const IMAGE_TRIM_VERSION = 'edge-fill-v1' as const;

/** Fixed trim contract — changing these values invalidates output hashes. */
export const IMAGE_TRIM_PARAMS = {
  version: IMAGE_TRIM_VERSION,
  /** RGB channel minimum to count as near-white (inclusive). */
  nearWhiteMinChannel: 245,
  /** Alpha minimum to treat a pixel as opaque fill (inclusive). */
  opaqueAlphaMin: 250,
  /** Fraction of a border row/col that must be near-white. */
  uniformityRatio: 0.992,
  /** First content row/col after candidate band must be below this white ratio. */
  contentTransitionMaxWhiteRatio: 0.96,
  /** Ignore tiny borders (noise / single-pixel seams). */
  minTrimPixels: 8,
  /** Per-side cap as a fraction of that axis. */
  maxTrimRatioPerSide: 0.18,
  /** Combined top+bottom (or left+right) cap as a fraction of that axis. */
  maxCombinedTrimRatio: 0.36,
  /** Refuse trim if remaining width/height would fall below this. */
  minRemainingSide: 64,
  /** Refuse trim if remaining area ratio vs original falls below this. */
  minRemainingAreaRatio: 0.5,
} as const;

export type ImageTrimParams = typeof IMAGE_TRIM_PARAMS;

export type ImageTrimSidePixels = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type ImageTrimDecision = {
  trimApplied: boolean;
  version: typeof IMAGE_TRIM_VERSION;
  params: ImageTrimParams;
  originalWidth: number;
  originalHeight: number;
  trimmedWidth: number;
  trimmedHeight: number;
  pixelsRemoved: ImageTrimSidePixels;
  confidence: 'high' | 'none';
  reason: string;
};

function isNearWhite(
  data: Buffer,
  index: number,
  channels: number,
  params: ImageTrimParams,
): boolean {
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  const a = channels > 3 ? data[index + 3] : 255;
  if (a < params.opaqueAlphaMin) return false;
  return (
    r >= params.nearWhiteMinChannel &&
    g >= params.nearWhiteMinChannel &&
    b >= params.nearWhiteMinChannel
  );
}

function rowWhiteRatio(
  data: Buffer,
  width: number,
  channels: number,
  y: number,
  x0: number,
  x1: number,
  params: ImageTrimParams,
): number {
  const span = x1 - x0;
  if (span <= 0) return 0;
  let hit = 0;
  for (let x = x0; x < x1; x++) {
    const i = (y * width + x) * channels;
    if (isNearWhite(data, i, channels, params)) hit++;
  }
  return hit / span;
}

function colWhiteRatio(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  x: number,
  y0: number,
  y1: number,
  params: ImageTrimParams,
): number {
  const span = y1 - y0;
  if (span <= 0) return 0;
  let hit = 0;
  for (let y = y0; y < y1; y++) {
    const i = (y * width + x) * channels;
    if (isNearWhite(data, i, channels, params)) hit++;
  }
  return hit / span;
}

function measureTop(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  params: ImageTrimParams,
): { depth: number; reason?: string } {
  const maxDepth = Math.floor(height * params.maxTrimRatioPerSide);
  let depth = 0;
  for (let y = 0; y < maxDepth; y++) {
    if (
      rowWhiteRatio(data, width, channels, y, 0, width, params) >=
      params.uniformityRatio
    ) {
      depth++;
    } else {
      break;
    }
  }
  if (depth === 0) return { depth: 0 };
  if (depth < params.minTrimPixels) {
    return { depth: 0, reason: 'top_below_min_pixels' };
  }
  if (depth >= maxDepth) {
    return { depth: 0, reason: 'top_exceeds_max_ratio' };
  }
  // Require a clear transition into non-fill content.
  if (depth < height) {
    const next = rowWhiteRatio(data, width, channels, depth, 0, width, params);
    if (next > params.contentTransitionMaxWhiteRatio) {
      return { depth: 0, reason: 'top_ambiguous_transition' };
    }
  }
  return { depth };
}

function measureBottom(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  params: ImageTrimParams,
): { depth: number; reason?: string } {
  const maxDepth = Math.floor(height * params.maxTrimRatioPerSide);
  let depth = 0;
  for (let y = height - 1; y >= height - maxDepth; y--) {
    if (
      rowWhiteRatio(data, width, channels, y, 0, width, params) >=
      params.uniformityRatio
    ) {
      depth++;
    } else {
      break;
    }
  }
  if (depth === 0) return { depth: 0 };
  if (depth < params.minTrimPixels) {
    return { depth: 0, reason: 'bottom_below_min_pixels' };
  }
  if (depth >= maxDepth) {
    return { depth: 0, reason: 'bottom_exceeds_max_ratio' };
  }
  const contentY = height - depth - 1;
  if (contentY >= 0) {
    const next = rowWhiteRatio(
      data,
      width,
      channels,
      contentY,
      0,
      width,
      params,
    );
    if (next > params.contentTransitionMaxWhiteRatio) {
      return { depth: 0, reason: 'bottom_ambiguous_transition' };
    }
  }
  return { depth };
}

function measureLeft(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  params: ImageTrimParams,
): { depth: number; reason?: string } {
  const maxDepth = Math.floor(width * params.maxTrimRatioPerSide);
  let depth = 0;
  for (let x = 0; x < maxDepth; x++) {
    if (
      colWhiteRatio(data, width, height, channels, x, 0, height, params) >=
      params.uniformityRatio
    ) {
      depth++;
    } else {
      break;
    }
  }
  if (depth === 0) return { depth: 0 };
  if (depth < params.minTrimPixels) {
    return { depth: 0, reason: 'left_below_min_pixels' };
  }
  if (depth >= maxDepth) {
    return { depth: 0, reason: 'left_exceeds_max_ratio' };
  }
  if (depth < width) {
    const next = colWhiteRatio(
      data,
      width,
      height,
      channels,
      depth,
      0,
      height,
      params,
    );
    if (next > params.contentTransitionMaxWhiteRatio) {
      return { depth: 0, reason: 'left_ambiguous_transition' };
    }
  }
  return { depth };
}

function measureRight(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  params: ImageTrimParams,
): { depth: number; reason?: string } {
  const maxDepth = Math.floor(width * params.maxTrimRatioPerSide);
  let depth = 0;
  for (let x = width - 1; x >= width - maxDepth; x--) {
    if (
      colWhiteRatio(data, width, height, channels, x, 0, height, params) >=
      params.uniformityRatio
    ) {
      depth++;
    } else {
      break;
    }
  }
  if (depth === 0) return { depth: 0 };
  if (depth < params.minTrimPixels) {
    return { depth: 0, reason: 'right_below_min_pixels' };
  }
  if (depth >= maxDepth) {
    return { depth: 0, reason: 'right_exceeds_max_ratio' };
  }
  const contentX = width - depth - 1;
  if (contentX >= 0) {
    const next = colWhiteRatio(
      data,
      width,
      height,
      channels,
      contentX,
      0,
      height,
      params,
    );
    if (next > params.contentTransitionMaxWhiteRatio) {
      return { depth: 0, reason: 'right_ambiguous_transition' };
    }
  }
  return { depth };
}

function noneDecision(
  width: number,
  height: number,
  reason: string,
  pixels: ImageTrimSidePixels = { top: 0, right: 0, bottom: 0, left: 0 },
): ImageTrimDecision {
  return {
    trimApplied: false,
    version: IMAGE_TRIM_VERSION,
    params: IMAGE_TRIM_PARAMS,
    originalWidth: width,
    originalHeight: height,
    trimmedWidth: width,
    trimmedHeight: height,
    pixelsRemoved: pixels,
    confidence: 'none',
    reason,
  };
}

/**
 * Decide a conservative crop box for near-white edge fill.
 * Operates on already EXIF-oriented raw RGBA/RGB pixels.
 */
export function decideWhiteBorderTrim(input: {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}): ImageTrimDecision {
  const { data, width, height, channels } = input;
  const params = IMAGE_TRIM_PARAMS;

  if (width < params.minRemainingSide || height < params.minRemainingSide) {
    return noneDecision(width, height, 'image_too_small');
  }
  if (channels < 3) {
    return noneDecision(width, height, 'unsupported_channels');
  }

  const top = measureTop(data, width, height, channels, params);
  const bottom = measureBottom(data, width, height, channels, params);
  const left = measureLeft(data, width, height, channels, params);
  const right = measureRight(data, width, height, channels, params);

  const refuseReasons = [
    top.reason,
    bottom.reason,
    left.reason,
    right.reason,
  ].filter(Boolean) as string[];

  let topPx = top.depth;
  let bottomPx = bottom.depth;
  let leftPx = left.depth;
  let rightPx = right.depth;

  // If a side was refused for ambiguity/size, keep zero for that side only.
  if (top.reason) topPx = 0;
  if (bottom.reason) bottomPx = 0;
  if (left.reason) leftPx = 0;
  if (right.reason) rightPx = 0;

  if (topPx + bottomPx + leftPx + rightPx === 0) {
    return noneDecision(
      width,
      height,
      refuseReasons[0] ?? 'no_edge_fill_detected',
    );
  }

  if ((topPx + bottomPx) / height > params.maxCombinedTrimRatio) {
    return noneDecision(width, height, 'combined_vertical_trim_too_large', {
      top: topPx,
      right: rightPx,
      bottom: bottomPx,
      left: leftPx,
    });
  }
  if ((leftPx + rightPx) / width > params.maxCombinedTrimRatio) {
    return noneDecision(width, height, 'combined_horizontal_trim_too_large', {
      top: topPx,
      right: rightPx,
      bottom: bottomPx,
      left: leftPx,
    });
  }

  const trimmedWidth = width - leftPx - rightPx;
  const trimmedHeight = height - topPx - bottomPx;
  if (
    trimmedWidth < params.minRemainingSide ||
    trimmedHeight < params.minRemainingSide
  ) {
    return noneDecision(width, height, 'remaining_dims_invalid', {
      top: topPx,
      right: rightPx,
      bottom: bottomPx,
      left: leftPx,
    });
  }

  const areaRatio = (trimmedWidth * trimmedHeight) / (width * height);
  if (areaRatio < params.minRemainingAreaRatio) {
    return noneDecision(width, height, 'remaining_area_too_small', {
      top: topPx,
      right: rightPx,
      bottom: bottomPx,
      left: leftPx,
    });
  }

  return {
    trimApplied: true,
    version: IMAGE_TRIM_VERSION,
    params,
    originalWidth: width,
    originalHeight: height,
    trimmedWidth,
    trimmedHeight,
    pixelsRemoved: {
      top: topPx,
      right: rightPx,
      bottom: bottomPx,
      left: leftPx,
    },
    confidence: 'high',
    reason: 'edge_fill_detected',
  };
}

export function trimRegionFromDecision(decision: ImageTrimDecision): {
  left: number;
  top: number;
  width: number;
  height: number;
} | null {
  if (!decision.trimApplied) return null;
  return {
    left: decision.pixelsRemoved.left,
    top: decision.pixelsRemoved.top,
    width: decision.trimmedWidth,
    height: decision.trimmedHeight,
  };
}
