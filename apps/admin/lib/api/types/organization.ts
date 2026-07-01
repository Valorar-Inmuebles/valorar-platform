import type {
  PropertyEditPolicy,
  PropertyVisibilityPolicy,
} from "@/lib/permissions";

export type OrganizationSettings = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  companyName?: string | null;
  legalName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
  shortDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  domain?: string | null;
  propertyVisibilityPolicy: PropertyVisibilityPolicy;
  propertyEditPolicy: PropertyEditPolicy;
};

export type UpdateOrganizationPayload = Partial<
  Omit<OrganizationSettings, "tenantId" | "tenantName" | "tenantSlug">
>;

export type AssignableUserOption = {
  id: string;
  name: string;
};
