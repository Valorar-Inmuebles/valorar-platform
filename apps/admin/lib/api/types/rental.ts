export type ContactPointType = "EMAIL" | "PHONE";

export type RentalContactPoint = {
  id: string;
  contactId: string;
  type: ContactPointType;
  value: string;
  normalizedValue: string;
  label: string | null;
  isDefault: boolean;
  isActive: boolean;
  canReceiveSms: boolean;
  canReceiveWhatsapp: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RentalContact = {
  id: string;
  tenantId: string;
  name: string;
  notes: string | null;
  isActive: boolean;
  contactPoints: RentalContactPoint[];
  createdAt: string;
  updatedAt: string;
};

export type CreateRentalContactPointPayload = {
  type: ContactPointType;
  value: string;
  label?: string;
  isDefault?: boolean;
  isActive?: boolean;
  canReceiveSms?: boolean;
  canReceiveWhatsapp?: boolean;
};

export type UpdateRentalContactPointPayload = Partial<
  Omit<CreateRentalContactPointPayload, "type">
>;

export type CreateRentalContactPayload = {
  name: string;
  notes?: string;
  isActive?: boolean;
  contactPoints?: CreateRentalContactPointPayload[];
};

export type UpdateRentalContactPayload = Partial<
  Omit<CreateRentalContactPayload, "contactPoints">
>;

export type RentalContractStatus = "DRAFT" | "ACTIVE" | "ENDED" | "CANCELLED";

export type RentalContract = {
  id: string;
  tenantId: string;
  propertyId: string | null;
  property: { id: string; title: string } | null;
  renterContactId: string | null;
  renterContact: { id: string; name: string; isActive: boolean } | null;
  landlordContactId: string | null;
  landlordContact: { id: string; name: string; isActive: boolean } | null;
  createdById: string | null;
  propertyAddressSnapshot: string;
  propertyLocalitySnapshot: string | null;
  propertyUnitSnapshot: string | null;
  propertyNotesSnapshot: string | null;
  startsOn: string;
  endsOn: string | null;
  status: RentalContractStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRentalContractPayload = {
  propertyId?: string | null;
  renterContactId?: string | null;
  landlordContactId?: string | null;
  propertyAddressSnapshot: string;
  propertyLocalitySnapshot?: string | null;
  propertyUnitSnapshot?: string | null;
  propertyNotesSnapshot?: string | null;
  startsOn: string;
  endsOn?: string | null;
  notes?: string | null;
};

export type UpdateRentalContractPayload = Partial<CreateRentalContractPayload>;

export type RentalConceptSystemCode =
  | "RENT"
  | "EXPENSES"
  | "ELECTRICITY"
  | "GAS"
  | "ABL"
  | "AYSA"
  | "INSURANCE";

export type RentalConcept = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  systemCode: RentalConceptSystemCode | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
