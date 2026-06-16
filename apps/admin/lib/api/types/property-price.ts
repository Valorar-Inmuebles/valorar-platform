export type PriceCurrency = "ARS" | "USD";

export type AdminPropertyPrice = {
  id: string;
  tenantId: string;
  listingId: string;
  amount: number;
  currency: PriceCurrency;
  isPrimary: boolean;
  label: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePropertyPricePayload = {
  amount: number;
  currency: PriceCurrency;
  label?: string;
};

export type UpdatePropertyPricePayload = {
  amount?: number;
  currency?: PriceCurrency;
  isPrimary?: boolean;
  label?: string;
};

export type PropertyPriceFormValues = {
  amount: string;
  currency: PriceCurrency | "";
  label: string;
};
