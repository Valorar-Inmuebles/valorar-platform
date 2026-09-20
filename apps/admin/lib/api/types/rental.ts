export type ContactPointType = "EMAIL" | "PHONE";
export type ContactDocumentType = "DNI" | "CUIT" | "CUIL" | "PASSPORT";

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
  documentType: ContactDocumentType | null;
  documentNumber: string | null;
  notes: string | null;
  isActive: boolean;
  contactPoints: RentalContactPoint[];
  createdAt: string;
  updatedAt: string;
};

export type RentalContactSearchItem = Pick<
  RentalContact,
  "id" | "name" | "documentType" | "documentNumber" | "isActive"
> & {
  contactPoints: Array<
    Pick<
      RentalContactPoint,
      | "id"
      | "type"
      | "value"
      | "label"
      | "isDefault"
      | "canReceiveSms"
      | "canReceiveWhatsapp"
    >
  >;
};

export type RentalPropertySearchItem = {
  id: string;
  title: string;
  internalCode: string | null;
  propertyType: string;
  isActive: boolean;
  street: string | null;
  streetNumber: string | null;
  floor: string | null;
  apartment: string | null;
  neighborhood: string | null;
  city: string;
  province: string | null;
  country: string;
  countryId: string | null;
  provinceId: string | null;
  localityId: string | null;
  neighborhoodId: string | null;
  postalCode: string | null;
  formattedAddress: string | null;
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
  documentType?: ContactDocumentType;
  documentNumber?: string;
  notes?: string;
  isActive?: boolean;
  contactPoints?: CreateRentalContactPointPayload[];
};

export type UpdateRentalContactPayload = Partial<
  Omit<CreateRentalContactPayload, "contactPoints">
>;

export type RentalContractStatus = "DRAFT" | "ACTIVE" | "ENDED" | "CANCELLED";
export type RentalContractPartyRole = "RENTER" | "LANDLORD";
export type NotificationChannel = "EMAIL" | "WHATSAPP" | "SMS";

export type RentalContractNotificationRoute = {
  id?: string;
  channel: NotificationChannel;
  contactPointId: string;
  isEnabled: boolean;
};

export type RentalContractParty = {
  id?: string;
  contactId: string;
  role: RentalContractPartyRole;
  isPrimary: boolean;
  contact: RentalContact;
  notificationRoutes: RentalContractNotificationRoute[];
};

export type RentalContract = {
  id: string;
  internalNumber: string;
  tenantId: string;
  propertyId: string | null;
  property: {
    id: string;
    title: string;
    propertyType: string;
    isActive: boolean;
  } | null;
  createdById: string | null;
  propertyAddressSnapshot: string;
  propertyCountryId: string | null;
  propertyProvinceId: string | null;
  propertyLocalityId: string | null;
  propertyNeighborhoodId: string | null;
  propertyCountrySnapshot: string | null;
  propertyProvinceSnapshot: string | null;
  propertyLocalitySnapshot: string | null;
  propertyNeighborhoodSnapshot: string | null;
  propertyStreetSnapshot: string | null;
  propertyStreetNumberSnapshot: string | null;
  propertyFloorSnapshot: string | null;
  propertyUnitSnapshot: string | null;
  propertyPostalCodeSnapshot: string | null;
  propertyNotesSnapshot: string | null;
  startsOn: string;
  endsOn: string | null;
  status: RentalContractStatus;
  notes: string | null;
  parties: RentalContractParty[];
  previousContract: RentalContractRelationSummary | null;
  renewedContract: RentalContractRelationSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type RentalContractListItem = {
  id: string;
  internalNumber: string;
  status: RentalContractStatus;
  propertyId: string | null;
  propertyAddressSnapshot: string;
  propertyCountryId: string | null;
  propertyProvinceId: string | null;
  propertyLocalityId: string | null;
  propertyNeighborhoodId: string | null;
  startsOn: string;
  endsOn: string | null;
  createdAt: string;
  updatedAt: string;
  property: {
    id: string;
    title: string;
    propertyType: string;
    isActive: boolean;
  } | null;
  parties: Array<{
    role: RentalContractPartyRole;
    isPrimary: boolean;
    contact: { id: string; name: string };
  }>;
  nextDueOccurrence: {
    id: string;
    dueDate: string | null;
    dueDatePending: boolean;
    amount: number | null;
    currency: "ARS" | "USD";
    concept: Pick<RentalConcept, "id" | "name" | "systemCode">;
  } | null;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type RentalContractGeneral = RentalContract & {
  currentRent: {
    obligationId: string;
    amount: number | null;
    currency: "ARS" | "USD";
    adjustmentIntervalMonths: number | null;
    adjustmentConfigurationPending: boolean;
    nextAdjustmentDate: string | null;
  } | null;
};
export type RentalDashboard = {
  contracts: Record<RentalContractStatus, number>;
  attention: {
    endingSoon: number;
    pendingOccurrences: number;
    overdueOccurrences: number;
    fulfilledOccurrences: number;
  };
  activity: Array<{
    id: string;
    contractId: string;
    type:
      | "ACTIVATED"
      | "ENDED"
      | "CANCELLED"
      | "PARTIES_CHANGED"
      | "RENT_VALUE_REVISED"
      | "RENEWED";
    occurredAt: string;
    contract: { internalNumber: string };
    actor: { id: string; name: string } | null;
  }>;
  communications: { available: false; sent: null };
};

export type RentalContractListQuery = {
  status?: RentalContractStatus;
  search?: string;
  endingWithinDays?: number;
  provinceId?: string;
  localityId?: string;
  neighborhoodId?: string;
  sortBy?:
    | "internalNumber"
    | "startsOn"
    | "endsOn"
    | "status"
    | "propertyAddress"
    | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};
export type RentalContractRelationSummary = {
  id: string;
  internalNumber: string;
  status: RentalContractStatus;
};

export type CreateRentalContractPayload = {
  propertyId?: string | null;
  propertyCountryId?: string | null;
  propertyProvinceId?: string | null;
  propertyLocalityId?: string | null;
  propertyNeighborhoodId?: string | null;
  propertyCountrySnapshot?: string | null;
  propertyProvinceSnapshot?: string | null;
  propertyLocalitySnapshot?: string | null;
  propertyNeighborhoodSnapshot?: string | null;
  propertyStreetSnapshot: string;
  propertyStreetNumberSnapshot?: string | null;
  propertyFloorSnapshot?: string | null;
  propertyUnitSnapshot?: string | null;
  propertyPostalCodeSnapshot?: string | null;
  propertyNotesSnapshot?: string | null;
  startsOn: string;
  endsOn?: string | null;
  notes?: string | null;
  parties?: Array<{
    contactId: string;
    role: RentalContractPartyRole;
    isPrimary?: boolean;
    notificationRoutes?: Array<{
      channel: NotificationChannel;
      contactPointId: string;
      isEnabled?: boolean;
    }>;
  }>;
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

export type RentalObligationKind = "RECURRING" | "ONE_TIME";
export type RentalAmountMode = "FIXED" | "VARIABLE";
export type RentalDueMode = "FIXED_DAY" | "MANUAL_PER_PERIOD";
export type RentalOccurrenceStatus =
  | "PENDING"
  | "OVERDUE"
  | "FULFILLED"
  | "CANCELLED";

export type RentalObligation = {
  id: string;
  tenantId: string;
  contractId: string;
  conceptId: string;
  concept: Pick<RentalConcept, "id" | "name" | "systemCode" | "isActive">;
  kind: RentalObligationKind;
  recurrenceMonths: number | null;
  dueMode: RentalDueMode;
  dueDay: number | null;
  amountMode: RentalAmountMode;
  defaultAmount: number | null;
  adjustmentIntervalMonths: number | null;
  includeInNotice: boolean;
  showAmount: boolean;
  nextAdjustmentDate: string | null;
  adjustmentConfigurationPending: boolean;
  rentValueRevisions: RentalRentValueRevision[];
  currency: "ARS" | "USD";
  startsOn: string;
  endsOn: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RentalRentValueRevision = {
  id: string;
  effectiveFrom: string;
  amount: number;
  currency: "ARS" | "USD";
  recordedById: string | null;
  reason: string | null;
  createdAt: string;
};

export type RentalFulfillment = {
  id: string;
  status: "RECORDED" | "REVERSED";
  fulfilledOn: string;
  amount: number | null;
  notes: string | null;
  recordedById: string | null;
  reversedAt: string | null;
  reversedById: string | null;
  reversalReason: string | null;
};

export type RentalOccurrence = {
  id: string;
  tenantId: string;
  obligationId: string;
  periodKey: string;
  periodStartsOn: string | null;
  periodEndsOn: string | null;
  dueDate: string | null;
  dueDatePending: boolean;
  amount: number | null;
  currency: "ARS" | "USD";
  status: Exclude<RentalOccurrenceStatus, "OVERDUE">;
  operationalStatus: RentalOccurrenceStatus;
  cancellationReason: string | null;
  obligation: {
    id: string;
    concept: Pick<RentalConcept, "id" | "name" | "systemCode">;
    contract: {
      id: string;
      internalNumber: string;
      status: RentalContractStatus;
      propertyAddressSnapshot: string;
      parties: Array<{ contact: { id: string; name: string } }>;
    };
  };
  fulfillments: RentalFulfillment[];
  fulfillmentSummary: {
    id: string;
    status: "RECORDED";
    fulfilledOn: string;
    amount: number | null;
    actorId: string | null;
    notes: string | null;
  } | null;
  actions: {
    canSetDueDate: boolean;
    canSetAmount: boolean;
    canFulfill: boolean;
    canCancel: boolean;
    canReverseFulfillment: boolean;
  };
};

export type CreateRentalObligationPayload = {
  contractId: string;
  conceptId: string;
  kind: RentalObligationKind;
  recurrenceMonths?: number | null;
  dueMode?: RentalDueMode;
  dueDay?: number | null;
  amountMode: RentalAmountMode;
  defaultAmount?: number | null;
  adjustmentIntervalMonths?: number | null;
  includeInNotice?: boolean;
  showAmount?: boolean;
  currency: "ARS" | "USD";
  startsOn: string;
  endsOn?: string | null;
  oneTimeDueDate?: string | null;
  isActive?: boolean;
};

export type UpdateRentalObligationPayload = Partial<
  Omit<CreateRentalObligationPayload, "contractId" | "oneTimeDueDate">
>;
