import {
  ALLOWED_IMAGE_ACCEPT,
  MAX_IMAGE_FILE_SIZE_BYTES,
} from "@/lib/api/types/property-image";

const ALLOWED_MIME_TYPES = ALLOWED_IMAGE_ACCEPT.split(",");

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return "Formato no soportado. Usá JPG, PNG, WebP o GIF.";
  }

  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    return "La imagen supera el tamaño máximo de 10 MB.";
  }

  return null;
}

export async function putFileToSignedUrl(
  uploadUrl: string,
  file: File,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("No se pudo subir la imagen al almacenamiento.");
  }
}

export function sortImagesByOrder<T extends { sortOrder: number; createdAt: string }>(
  images: T[],
): T[] {
  return [...images].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

export function buildReorderItems<T extends { id: string }>(
  images: T[],
): Array<{ id: string; sortOrder: number }> {
  return images.map((image, index) => ({
    id: image.id,
    sortOrder: index,
  }));
}
