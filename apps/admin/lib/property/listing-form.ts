import type { PropertyListingType } from "@repo/shared-types";
import { moneyToInputValue, parseMoneyInput } from "@repo/shared-types/format-money";
import type {
  AdminPropertyListing,
  CreatePropertyListingPayload,
  PropertyListingFormValues,
  PropertyListingStatus,
  UpdatePropertyListingPayload,
} from "@/lib/api/types/property-listing";

export function emptyListingFormValues(): PropertyListingFormValues {
  return {
    listingType: "",
    expensesAmount: "",
    expensesCurrency: "",
    isFeatured: false,
    status: "",
  };
}

export function listingToFormValues(
  listing: AdminPropertyListing,
): PropertyListingFormValues {
  return {
    listingType: listing.listingType,
    expensesAmount:
      listing.expensesAmount != null
        ? moneyToInputValue(listing.expensesAmount)
        : "",
    expensesCurrency: listing.expensesCurrency ?? "",
    isFeatured: listing.isFeatured,
    status: listing.status,
  };
}

function parseOptionalFloat(value: string): number | undefined {
  return parseMoneyInput(value);
}

export function validateListingCreateValues(
  values: PropertyListingFormValues,
): string | null {
  if (!values.listingType) return "Seleccioná un tipo de publicación.";
  if (values.expensesAmount.trim() && !values.expensesCurrency) {
    return "Seleccioná la moneda de expensas.";
  }
  return null;
}

export function validateListingEditValues(
  values: PropertyListingFormValues,
): string | null {
  if (values.expensesAmount.trim() && !values.expensesCurrency) {
    return "Seleccioná la moneda de expensas.";
  }
  if (!values.status) return "Seleccioná un estado.";
  return null;
}

export function formValuesToCreatePayload(
  values: PropertyListingFormValues,
): CreatePropertyListingPayload {
  return {
    listingType: values.listingType as PropertyListingType,
    expensesAmount: parseOptionalFloat(values.expensesAmount),
    expensesCurrency: values.expensesCurrency || undefined,
    isFeatured: values.isFeatured,
  };
}

export function formValuesToUpdatePayload(
  values: PropertyListingFormValues,
  currentStatus: PropertyListingStatus,
): UpdatePropertyListingPayload {
  const payload: UpdatePropertyListingPayload = {
    expensesAmount: parseOptionalFloat(values.expensesAmount),
    expensesCurrency: values.expensesCurrency || undefined,
    isFeatured: values.isFeatured,
  };

  if (values.status && values.status !== currentStatus) {
    payload.status = values.status;
  }

  return payload;
}
