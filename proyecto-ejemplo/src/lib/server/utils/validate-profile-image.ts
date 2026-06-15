import { readJpegDimensions } from "@/lib/server/utils/jpeg-dimensions";

export const MAX_PROFILE_IMAGE_BYTES = 1024 * 1024;

export class ProfileImageValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ProfileImageValidationError";
  }
}

export async function validateProfileImageFile(
  file: File,
  field = "foto",
): Promise<Uint8Array> {
  if (file.type !== "image/jpeg") {
    throw new ProfileImageValidationError(
      "La imagen debe ser JPEG.",
      field,
      "INVALID_TYPE",
    );
  }

  if (file.size === 0 || file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new ProfileImageValidationError(
      "La imagen no puede superar 1 MB.",
      field,
      "INVALID_SIZE",
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!readJpegDimensions(bytes)) {
    throw new ProfileImageValidationError(
      "No se pudo leer la imagen.",
      field,
      "INVALID_IMAGE",
    );
  }

  return bytes;
}
