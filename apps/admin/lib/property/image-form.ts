import type {
  AdminPropertyImage,
  PropertyImageEditFormValues,
} from "@/lib/api/types/property-image";

export function emptyImageEditFormValues(): PropertyImageEditFormValues {
  return {
    altText: "",
  };
}

export function imageToEditFormValues(
  image: AdminPropertyImage,
): PropertyImageEditFormValues {
  return {
    altText: image.altText ?? "",
  };
}

export function formValuesToUpdatePayload(
  values: PropertyImageEditFormValues,
) {
  const altText = values.altText.trim();
  return {
    altText: altText.length > 0 ? altText : undefined,
  };
}
