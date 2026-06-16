export function readJpegDimensions(
  buffer: Uint8Array,
): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;

    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0x01 || marker === 0xd9) {
      offset += 2;
      continue;
    }

    const segmentLength = (buffer[offset + 2] << 8) + buffer[offset + 3];
    if (segmentLength < 2) return null;

    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isSof) {
      return {
        height: (buffer[offset + 5] << 8) + buffer[offset + 6],
        width: (buffer[offset + 7] << 8) + buffer[offset + 8],
      };
    }

    offset += 2 + segmentLength;
  }

  return null;
}
