const MAX_IMAGE_BYTES = 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function prepareProfileImageFile(file: File): Promise<File> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new Error("Formato no válido. Usá JPEG, PNG o WebP.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("La imagen no puede superar 1 MB.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const blob = await canvasToJpegBlob(image);
    const prepared = new File([blob], "profile.jpg", { type: "image/jpeg" });

    if (prepared.size > MAX_IMAGE_BYTES) {
      throw new Error(
        "La imagen supera 1 MB después de convertirla. Probá con un archivo más liviano.",
      );
    }

    return prepared;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** @deprecated Use prepareProfileImageFile */
export const prepareTenantLogoFile = prepareProfileImageFile;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo leer la imagen."));
    image.src = src;
  });
}

function canvasToJpegBlob(image: HTMLImageElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("No se pudo procesar la imagen."));
      return;
    }

    ctx.drawImage(image, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo convertir la imagen."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92,
    );
  });
}
