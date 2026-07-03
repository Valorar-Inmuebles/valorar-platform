import type { PriceCurrency } from "@/lib/api/types/development";

export type AdminDevelopmentTypology = {
  id: string;
  tenantId: string;
  developmentId: string;
  name: string;
  description: string;
  totalCount: number | null;
  availableCount: number | null;
  surfaceFrom: number | null;
  surfaceTo: number | null;
  priceFrom: number | null;
  currency: PriceCurrency | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateDevelopmentTypologyPayload = {
  developmentId: string;
  name: string;
  description: string;
  totalCount?: number;
  availableCount?: number;
  surfaceFrom?: number;
  surfaceTo?: number;
  priceFrom?: number;
  currency?: PriceCurrency;
  sortOrder?: number;
};

export type UpdateDevelopmentTypologyPayload = Partial<
  Omit<CreateDevelopmentTypologyPayload, "developmentId">
>;

export type DevelopmentTypologyFormValues = {
  name: string;
  description: string;
  totalCount: string;
  availableCount: string;
  surfaceFrom: string;
  surfaceTo: string;
  priceFrom: string;
  currency: PriceCurrency | "";
};
