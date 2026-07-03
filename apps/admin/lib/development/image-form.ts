import type {
  AdminDevelopmentImage,
  DevelopmentImageEditFormValues,
} from "@/lib/api/types/development-image";

export function emptyImageEditFormValues(): DevelopmentImageEditFormValues {
  return {
    altText: "",
  };
}

export function imageToEditFormValues(
  image: AdminDevelopmentImage,
): DevelopmentImageEditFormValues {
  return {
    altText: image.altText ?? "",
  };
}

export function formValuesToUpdatePayload(
  values: DevelopmentImageEditFormValues,
) {
  const altText = values.altText.trim();
  return {
    altText: altText.length > 0 ? altText : undefined,
  };
}
