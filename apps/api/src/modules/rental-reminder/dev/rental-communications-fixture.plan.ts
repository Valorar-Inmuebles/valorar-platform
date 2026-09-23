import {
  ContactPointType,
  Currency,
  NotificationChannel,
  RentalAmountMode,
  RentalConceptSystemCode,
  RentalContractPartyRole,
  RentalContractStatus,
  RentalDueMode,
  RentalObligationKind,
  RentalOccurrenceStatus,
  RentalReminderAttemptStatus,
  RentalReminderDeliveryStatus,
  RentalReminderDispatchOccurrenceStatus,
  RentalReminderDispatchStatus,
  RentalReminderEventType,
  RentalReminderPlanningIssueStatus,
  RentalReminderPlanningIssueType,
  RentalReminderStatusSource,
} from '../../../../generated/prisma/client';
import {
  computeAttemptKey,
  computeDeliveryKey,
  computeDispatchGroupKey,
  computeOccurrenceSetHash,
  computePlanningIssueKey,
} from '../domain/rental-reminder-domain';
import { addCalendarMonthsClamped } from '../../rental-obligation/utils/rent-value-revision';
import {
  addLocalDays,
  localDateAt,
  localDateKey,
  localDateTimeToUtc,
  LocalDate,
} from '../domain/rental-reminder-planner';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Identity resolution for the canonical fixture (demo tenant only). */
export const RENTAL_FIXTURE_TARGET_TENANT_SLUG = 'demo';
export const RENTAL_FIXTURE_TIME_ZONE = 'America/Argentina/Buenos_Aires';
/** Admin seed user who acknowledges inbound messages (see prisma/seed-data.ts). */
export const RENTAL_FIXTURE_ADMIN_EMAIL = 'admin@demo.valorar.dev';
export const RENTAL_FIXTURE_CONTRACT_INTERNAL_NUMBER = 'ALQ-000001';
const RENTAL_FIXTURE_TERM_MONTHS = 24;

/** Local calendar date -> UTC-midnight Date (matches the planner's dateValue). */
function localDateToDate(value: LocalDate): Date {
  return new Date(Date.UTC(value.year, value.month - 1, value.day));
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** today at `minutes` from midnight in the local day (UTC minutes), plus `seconds`. */
function localDayAt(
  today: { year: number; month: number; day: number },
  minutes: number,
  seconds: number,
  timeZone: string,
): Date {
  const base = localDateTimeToUtc(today, minutes, timeZone);
  return new Date(base.getTime() + seconds * 1000);
}

export type RentalCommunicationsFixtureSummary = {
  dispatchesScheduledToday: number;
  deliveriesSentToday: number;
  deliveriesDeliveredToday: number;
  deliveriesFailedToday: number;
  planningIssuesOpen: number;
  inboundUnacknowledged: number;
};

export type RentalCommunicationsFixturePlan = {
  tenantId: string;
  adminUserId: string;
  now: Date;
  timeZone: string;
  from: Date;
  to: Date;
  contractId: string;
  /** All fixture-scoped ids used by the cleanup step. */
  fixtureIds: {
    contactIds: string[];
    contactPointIds: string[];
    conceptIds: string[];
    contractIds: string[];
    partyIds: string[];
    routeIds: string[];
    obligationIds: string[];
    occurrenceIds: string[];
    dispatchIds: string[];
    deliveryIds: string[];
    attemptIds: string[];
    issueIds: string[];
    inboundIds: string[];
  };
  policy: {
    preDueEnabled: boolean;
    preDueDays: number;
    dueEnabled: boolean;
    postDueEnabled: boolean;
    postDueDays: number;
    sendTimeMinutes: number;
  };
  policySnapshot: {
    version: number;
    timeZone: string;
    preDueEnabled: boolean;
    preDueDays: number;
    dueEnabled: boolean;
    postDueEnabled: boolean;
    postDueDays: number;
    sendTimeMinutes: number;
  };
  tenantSettingTimeZone: string;
  sequenceLastValue: number;
  concepts: RentalConceptCreateManyInput[];
  contacts: ContactCreateManyInput[];
  contactPoints: ContactPointCreateManyInput[];
  contract: RentalContractUncheckedCreateInput;
  parties: RentalContractPartyCreateManyInput[];
  routes: RentalContractNotificationRouteCreateManyInput[];
  obligations: RentalObligationCreateManyInput[];
  occurrences: RentalObligationOccurrenceCreateManyInput[];
  dispatches: RentalReminderDispatchCreateManyInput[];
  dispatchOccurrences: RentalReminderDispatchOccurrenceCreateManyInput[];
  deliveries: RentalReminderDeliveryCreateManyInput[];
  attempts: RentalReminderDeliveryAttemptCreateManyInput[];
  planningIssue: RentalReminderPlanningIssueUncheckedCreateInput;
  inbound: CommunicationInboundMessageCreateManyInput[];
  expectedSummary: RentalCommunicationsFixtureSummary;
};

// Local aliases to keep the plan readable (values come from the generated client).
type RentalConceptCreateManyInput = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  systemCode: RentalConceptSystemCode | null;
  isActive: boolean;
  sortOrder: number;
};

type ContactCreateManyInput = {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
};

type ContactPointCreateManyInput = {
  id: string;
  tenantId: string;
  contactId: string;
  type: ContactPointType;
  value: string;
  normalizedValue: string;
  isDefault: boolean;
  isActive: boolean;
  canReceiveSms: boolean;
  canReceiveWhatsapp: boolean;
};

type RentalContractUncheckedCreateInput = {
  id: string;
  tenantId: string;
  createdById: string;
  internalNumber: string;
  propertyCountryId: string;
  propertyProvinceId: string;
  propertyLocalityId: string;
  propertyAddressSnapshot: string;
  startsOn: Date;
  endsOn: Date;
  status: RentalContractStatus;
};

export type RentalFixtureGeoReference = {
  countryId: string;
  provinceId: string;
  provinceName: string;
  localityId: string;
  localityName: string;
};

type RentalContractPartyCreateManyInput = {
  id: string;
  tenantId: string;
  contractId: string;
  contactId: string;
  role: RentalContractPartyRole;
  isPrimary: boolean;
};

type RentalContractNotificationRouteCreateManyInput = {
  id: string;
  tenantId: string;
  contractPartyId: string;
  channel: NotificationChannel;
  contactPointId: string;
  isEnabled: boolean;
};

type RentalObligationCreateManyInput = {
  id: string;
  tenantId: string;
  contractId: string;
  conceptId: string;
  kind: RentalObligationKind;
  recurrenceMonths: number;
  dueMode: RentalDueMode;
  dueDay: number;
  amountMode: RentalAmountMode;
  defaultAmount: string;
  currency: Currency;
  includeInNotice: boolean;
  showAmount: boolean;
  startsOn: Date;
  isActive: boolean;
};

type RentalObligationOccurrenceCreateManyInput = {
  id: string;
  tenantId: string;
  obligationId: string;
  periodKey: string;
  dueDate: Date;
  amount: string;
  currency: Currency;
  status: RentalOccurrenceStatus;
};

type RentalReminderDispatchCreateManyInput = {
  id: string;
  tenantId: string;
  contractId: string;
  recipientContactId: string;
  recipientIdentityKey: string;
  eventType: RentalReminderEventType;
  dueDate: Date;
  scheduledFor: Date;
  groupKey: string;
  occurrenceSetHash: string;
  status: RentalReminderDispatchStatus;
  policySnapshot: {
    version: number;
    timeZone: string;
    preDueEnabled: boolean;
    preDueDays: number;
    dueEnabled: boolean;
    postDueEnabled: boolean;
    postDueDays: number;
    sendTimeMinutes: number;
  };
  recipientSnapshot: { contactId: string; name: string };
  contentSnapshot: {
    version: number;
    renderState: string;
    eventType: string;
    dueDate: string;
    occurrences: Array<{
      occurrenceId: string;
      obligationId: string;
      conceptId: string;
      conceptName: string;
      dueDate: string;
      showAmount: boolean;
      amount: string | null;
      currency: string;
    }>;
  };
  firstAttemptAt: Date;
  frozenAt: Date;
  completedAt: Date;
};

type RentalReminderDispatchOccurrenceCreateManyInput = {
  tenantId: string;
  dispatchId: string;
  occurrenceId: string;
  status: RentalReminderDispatchOccurrenceStatus;
  evaluatedAt: Date;
};

type RentalReminderDeliveryCreateManyInput = {
  id: string;
  tenantId: string;
  dispatchId: string;
  channel: NotificationChannel;
  contactPointId: string | null;
  routeId: string | null;
  deliveryKey: string;
  status: RentalReminderDeliveryStatus;
  statusSource: RentalReminderStatusSource;
  destinationSnapshot: string;
  contentSnapshot: {
    version: number;
    renderState: string;
    eventType: string;
    dueDate: string;
    occurrences: Array<{
      occurrenceId: string;
      obligationId: string;
      conceptId: string;
      conceptName: string;
      dueDate: string;
      showAmount: boolean;
      amount: string | null;
      currency: string;
    }>;
  };
  subjectSnapshot: string | null;
  bodySnapshot: string;
  templateKey: string;
  templateVersion: string;
  providerKey: string;
  providerAccountKey: string;
  attemptCount: number;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  failedAt: Date | null;
  providerMessageId: string | null;
  errorCategory: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type RentalReminderDeliveryAttemptCreateManyInput = {
  id: string;
  tenantId: string;
  deliveryId: string;
  attemptNumber: number;
  attemptKey: string;
  status: RentalReminderAttemptStatus;
  startedAt: Date;
  finishedAt: Date;
  latencyMs: number;
  providerMessageId: string | null;
  errorCategory: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type RentalReminderPlanningIssueUncheckedCreateInput = {
  id: string;
  tenantId: string;
  contractId: string;
  occurrenceId: string;
  recipientContactId: string;
  channel: NotificationChannel | null;
  type: RentalReminderPlanningIssueType;
  deduplicationKey: string;
  status: RentalReminderPlanningIssueStatus;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
  metadata: { reason: string };
};

type CommunicationInboundMessageCreateManyInput = {
  id: string;
  tenantId: string;
  providerKey: string;
  providerAccountKey: string;
  channel: NotificationChannel;
  providerMessageId: string;
  senderAddress: string;
  messageType: string;
  body: string;
  metadata: { fixture: string; synthetic: boolean };
  receivedAt: Date;
  contactPointId: string | null;
  contactId: string | null;
  contractId: string | null;
  deliveryId: string | null;
  readAt: Date | null;
  acknowledgedAt: Date | null;
  acknowledgedById: string | null;
};

/**
 * Pure, deterministic plan for the canonical Rental Communications fixture
 * (C4C): it models a demo ACTIVE contract with a renter + co-renter, an
 * expenses obligation due in 3 days (PRE_DUE) and a rent obligation due today
 * (DUE), the resulting dispatches/deliveries/attempts, one OPEN planning issue
 * for the co-renter without routes, and two inbound WhatsApp messages.
 *
 * The plan never calls providers and never reads provider configuration: every
 * delivery uses `statusSource: INTERNAL`, all timestamps are derived from
 * `now` + the tenant timezone (`America/Argentina/Buenos_Aires`), and provider
 * ids are either `null` (deliveries) or synthetic `fx-wamid-*` (inbound).
 * Inbound messages: two uncorrelated (they validate the read model never
 * invents a correlation) and a third correlated by `deliveryId` to the
 * PRE_DUE WHATSAPP delivery.
 */
export function buildRentalCommunicationsFixturePlan(input: {
  tenantId: string;
  adminUserId: string;
  now: Date;
  timeZone: string;
  geo: RentalFixtureGeoReference;
}): RentalCommunicationsFixturePlan {
  const { tenantId, adminUserId, now, timeZone, geo } = input;

  const today = localDateAt(now, timeZone);
  const from = localDateTimeToUtc(today, 0, timeZone);
  const to = new Date(from.getTime() + DAY_MS);

  const rentDueDate = localDateToDate(today);
  const expensesDueDate = localDateToDate(addLocalDays(today, 3));
  const contractStartsOn = localDateToDate(addLocalDays(today, -366));
  const contractEndsOn = addCalendarMonthsClamped(
    contractStartsOn,
    RENTAL_FIXTURE_TERM_MONTHS,
  );

  // --- deterministic fixture ids -------------------------------------------------
  const ids = {
    contactRenter: 'fx-c4c-contact-renter',
    contactCorenter: 'fx-c4c-contact-corenter',
    contactPointRenterEmail: 'fx-c4c-contactpoint-renter-email',
    contactPointRenterWhatsapp: 'fx-c4c-contactpoint-renter-whatsapp',
    conceptRent: 'fx-c4c-concept-rent',
    conceptExpenses: 'fx-c4c-concept-expenses',
    contract: 'fx-c4c-contract-1',
    partyRenter: 'fx-c4c-party-renter',
    partyCorenter: 'fx-c4c-party-corenter',
    routeRenterEmail: 'fx-c4c-route-renter-email',
    routeRenterWhatsapp: 'fx-c4c-route-renter-whatsapp',
    obligationRent: 'fx-c4c-obligation-rent',
    obligationExpenses: 'fx-c4c-obligation-expenses',
    occurrenceRent: 'fx-c4c-occurrence-rent',
    occurrenceExpenses: 'fx-c4c-occurrence-expenses',
    dispatchPredue: 'fx-c4c-dispatch-predue',
    dispatchDue: 'fx-c4c-dispatch-due',
    deliveryPredueEmail: 'fx-c4c-delivery-predue-email',
    deliveryPredueWhatsapp: 'fx-c4c-delivery-predue-whatsapp',
    deliveryDueEmail: 'fx-c4c-delivery-due-email',
    deliveryDueWhatsapp: 'fx-c4c-delivery-due-whatsapp',
    attemptPredueEmail: 'fx-c4c-attempt-predue-email-1',
    attemptPredueWhatsapp: 'fx-c4c-attempt-predue-whatsapp-1',
    attemptDueEmail: 'fx-c4c-attempt-due-email-1',
    attemptDueWhatsapp: 'fx-c4c-attempt-due-whatsapp-1',
    issueCorenter: 'fx-c4c-issue-corenter-noroute',
    inbound1: 'fx-c4c-inbound-1',
    inbound2: 'fx-c4c-inbound-2',
    inbound3: 'fx-c4c-inbound-3',
  };

  const expectedSummary: RentalCommunicationsFixtureSummary = {
    dispatchesScheduledToday: 2,
    deliveriesSentToday: 3,
    deliveriesDeliveredToday: 2,
    deliveriesFailedToday: 1,
    planningIssuesOpen: 1,
    inboundUnacknowledged: 2,
  };

  // --- policy --------------------------------------------------------------------
  const policy = {
    preDueEnabled: true,
    preDueDays: 3,
    dueEnabled: true,
    postDueEnabled: true,
    postDueDays: 3,
    sendTimeMinutes: 600,
  };
  const policySnapshot = {
    version: 1,
    timeZone,
    ...policy,
  };

  // --- keys (mirror the planner/domain helpers) -----------------------------------
  const predueGroupKey = computeDispatchGroupKey({
    tenantId,
    contractId: ids.contract,
    recipientContactId: ids.contactRenter,
    eventType: RentalReminderEventType.PRE_DUE,
    dueDate: dateKey(expensesDueDate),
  });
  const dueGroupKey = computeDispatchGroupKey({
    tenantId,
    contractId: ids.contract,
    recipientContactId: ids.contactRenter,
    eventType: RentalReminderEventType.DUE,
    dueDate: dateKey(rentDueDate),
  });
  const deliveryKeys = {
    predueEmail: computeDeliveryKey(predueGroupKey, NotificationChannel.EMAIL),
    predueWhatsapp: computeDeliveryKey(
      predueGroupKey,
      NotificationChannel.WHATSAPP,
    ),
    dueEmail: computeDeliveryKey(dueGroupKey, NotificationChannel.EMAIL),
    dueWhatsapp: computeDeliveryKey(dueGroupKey, NotificationChannel.WHATSAPP),
  };
  const attemptKeys = {
    predueEmail: computeAttemptKey(deliveryKeys.predueEmail, 1),
    predueWhatsapp: computeAttemptKey(deliveryKeys.predueWhatsapp, 1),
    dueEmail: computeAttemptKey(deliveryKeys.dueEmail, 1),
    dueWhatsapp: computeAttemptKey(deliveryKeys.dueWhatsapp, 1),
  };

  // --- content snapshots (mirror the planner PENDING_C3 shape) --------------------
  const contentSnapshotFor = (input: {
    eventType: RentalReminderEventType;
    dueDate: Date;
    occurrences: Array<{
      occurrenceId: string;
      obligationId: string;
      conceptId: string;
      conceptName: string;
      dueDate: Date;
      showAmount: boolean;
      amount: string;
    }>;
  }) => ({
    version: 1,
    renderState: 'PENDING_C3',
    eventType: input.eventType,
    dueDate: dateKey(input.dueDate),
    occurrences: input.occurrences.map((item) => ({
      occurrenceId: item.occurrenceId,
      obligationId: item.obligationId,
      conceptId: item.conceptId,
      conceptName: item.conceptName,
      dueDate: dateKey(item.dueDate),
      showAmount: item.showAmount,
      amount: item.showAmount ? item.amount : null,
      currency: Currency.ARS,
    })),
  });

  const predueContentSnapshot = contentSnapshotFor({
    eventType: RentalReminderEventType.PRE_DUE,
    dueDate: expensesDueDate,
    occurrences: [
      {
        occurrenceId: ids.occurrenceExpenses,
        obligationId: ids.obligationExpenses,
        conceptId: ids.conceptExpenses,
        conceptName: 'Expensas',
        dueDate: expensesDueDate,
        showAmount: true,
        amount: '150000.00',
      },
    ],
  });
  const dueContentSnapshot = contentSnapshotFor({
    eventType: RentalReminderEventType.DUE,
    dueDate: rentDueDate,
    occurrences: [
      {
        occurrenceId: ids.occurrenceRent,
        obligationId: ids.obligationRent,
        conceptId: ids.conceptRent,
        conceptName: 'Alquiler',
        dueDate: rentDueDate,
        showAmount: true,
        amount: '850000.00',
      },
    ],
  });

  // --- timestamps (10:00 local = sendTimeMinutes 600) -----------------------------
  const scheduledFor = localDayAt(today, 600, 0, timeZone);
  const predueEmailSentAt = localDayAt(today, 600, 45, timeZone);
  const predueEmailDeliveredAt = localDayAt(today, 601, 0, timeZone);
  const predueWhatsappSentAt = localDayAt(today, 601, 0, timeZone);
  const predueWhatsappDeliveredAt = localDayAt(today, 601, 30, timeZone);
  const dueEmailSentAt = localDayAt(today, 602, 30, timeZone);
  const dueWhatsappFailedAt = localDayAt(today, 603, 30, timeZone);

  const inbound1ReceivedAt = localDayAt(today, 525, 0, timeZone); // 08:45
  const inbound2ReceivedAt = localDayAt(today, 550, 0, timeZone); // 09:10
  const inbound2ReadAt = localDayAt(today, 555, 0, timeZone); // 09:15
  const inbound2AcknowledgedAt = localDayAt(today, 555, 0, timeZone); // 09:15
  const inbound3ReceivedAt = localDayAt(today, 645, 0, timeZone); // 10:45
  const issueDetectedAt = localDayAt(today, 590, 0, timeZone); // 09:50

  // --- rows -----------------------------------------------------------------------
  const contacts: ContactCreateManyInput[] = [
    {
      id: ids.contactRenter,
      tenantId,
      name: 'Inquilino Fixture C4C',
      isActive: true,
    },
    {
      id: ids.contactCorenter,
      tenantId,
      name: 'Coinquilino Fixture C4C',
      isActive: true,
    },
  ];

  const contactPoints: ContactPointCreateManyInput[] = [
    {
      id: ids.contactPointRenterEmail,
      tenantId,
      contactId: ids.contactRenter,
      type: ContactPointType.EMAIL,
      value: 'renter.fixture@demo.valorar.dev',
      normalizedValue: 'renter.fixture@demo.valorar.dev',
      isDefault: true,
      isActive: true,
      canReceiveSms: false,
      canReceiveWhatsapp: false,
    },
    {
      id: ids.contactPointRenterWhatsapp,
      tenantId,
      contactId: ids.contactRenter,
      type: ContactPointType.PHONE,
      value: '+54 9 11 5555 0000',
      normalizedValue: '+5491155550000',
      isDefault: true,
      isActive: true,
      canReceiveSms: false,
      canReceiveWhatsapp: true,
    },
  ];

  const concepts: RentalConceptCreateManyInput[] = [
    {
      id: ids.conceptRent,
      tenantId,
      name: 'Alquiler',
      slug: 'alquiler',
      systemCode: RentalConceptSystemCode.RENT,
      isActive: true,
      sortOrder: 10,
    },
    {
      id: ids.conceptExpenses,
      tenantId,
      name: 'Expensas',
      slug: 'expensas',
      systemCode: RentalConceptSystemCode.EXPENSES,
      isActive: true,
      sortOrder: 20,
    },
  ];

  const contract: RentalContractUncheckedCreateInput = {
    id: ids.contract,
    tenantId,
    createdById: adminUserId,
    internalNumber: RENTAL_FIXTURE_CONTRACT_INTERNAL_NUMBER,
    propertyCountryId: geo.countryId,
    propertyProvinceId: geo.provinceId,
    propertyLocalityId: geo.localityId,
    propertyAddressSnapshot: `Av. Fixture 1234, ${geo.localityName}, ${geo.provinceName}`,
    startsOn: contractStartsOn,
    endsOn: contractEndsOn,
    status: RentalContractStatus.ACTIVE,
  };

  const parties: RentalContractPartyCreateManyInput[] = [
    {
      id: ids.partyRenter,
      tenantId,
      contractId: ids.contract,
      contactId: ids.contactRenter,
      role: RentalContractPartyRole.RENTER,
      isPrimary: true,
    },
    {
      id: ids.partyCorenter,
      tenantId,
      contractId: ids.contract,
      contactId: ids.contactCorenter,
      role: RentalContractPartyRole.RENTER,
      isPrimary: false,
    },
  ];

  const routes: RentalContractNotificationRouteCreateManyInput[] = [
    {
      id: ids.routeRenterEmail,
      tenantId,
      contractPartyId: ids.partyRenter,
      channel: NotificationChannel.EMAIL,
      contactPointId: ids.contactPointRenterEmail,
      isEnabled: true,
    },
    {
      id: ids.routeRenterWhatsapp,
      tenantId,
      contractPartyId: ids.partyRenter,
      channel: NotificationChannel.WHATSAPP,
      contactPointId: ids.contactPointRenterWhatsapp,
      isEnabled: true,
    },
  ];

  const obligations: RentalObligationCreateManyInput[] = [
    {
      id: ids.obligationRent,
      tenantId,
      contractId: ids.contract,
      conceptId: ids.conceptRent,
      kind: RentalObligationKind.RECURRING,
      recurrenceMonths: 1,
      dueMode: RentalDueMode.FIXED_DAY,
      dueDay: today.day,
      amountMode: RentalAmountMode.FIXED,
      defaultAmount: '850000.00',
      currency: Currency.ARS,
      includeInNotice: true,
      showAmount: true,
      startsOn: contractStartsOn,
      isActive: true,
    },
    {
      id: ids.obligationExpenses,
      tenantId,
      contractId: ids.contract,
      conceptId: ids.conceptExpenses,
      kind: RentalObligationKind.RECURRING,
      recurrenceMonths: 1,
      dueMode: RentalDueMode.FIXED_DAY,
      dueDay: today.day,
      amountMode: RentalAmountMode.FIXED,
      defaultAmount: '150000.00',
      currency: Currency.ARS,
      includeInNotice: true,
      showAmount: true,
      startsOn: contractStartsOn,
      isActive: true,
    },
  ];

  const occurrences: RentalObligationOccurrenceCreateManyInput[] = [
    {
      id: ids.occurrenceRent,
      tenantId,
      obligationId: ids.obligationRent,
      periodKey: `fx-c4c-rent-${localDateKey(today)}`,
      dueDate: rentDueDate,
      amount: '850000.00',
      currency: Currency.ARS,
      status: RentalOccurrenceStatus.PENDING,
    },
    {
      id: ids.occurrenceExpenses,
      tenantId,
      obligationId: ids.obligationExpenses,
      periodKey: `fx-c4c-expenses-${localDateKey(addLocalDays(today, 3))}`,
      dueDate: expensesDueDate,
      amount: '150000.00',
      currency: Currency.ARS,
      status: RentalOccurrenceStatus.PENDING,
    },
  ];

  const dispatches: RentalReminderDispatchCreateManyInput[] = [
    {
      id: ids.dispatchPredue,
      tenantId,
      contractId: ids.contract,
      recipientContactId: ids.contactRenter,
      recipientIdentityKey: `contact:${ids.contactRenter}`,
      eventType: RentalReminderEventType.PRE_DUE,
      dueDate: expensesDueDate,
      scheduledFor,
      groupKey: predueGroupKey,
      occurrenceSetHash: computeOccurrenceSetHash([ids.occurrenceExpenses]),
      status: RentalReminderDispatchStatus.COMPLETED,
      policySnapshot,
      recipientSnapshot: {
        contactId: ids.contactRenter,
        name: 'Inquilino Fixture C4C',
      },
      contentSnapshot: predueContentSnapshot,
      firstAttemptAt: predueEmailSentAt,
      frozenAt: scheduledFor,
      completedAt: predueWhatsappDeliveredAt,
    },
    {
      id: ids.dispatchDue,
      tenantId,
      contractId: ids.contract,
      recipientContactId: ids.contactRenter,
      recipientIdentityKey: `contact:${ids.contactRenter}`,
      eventType: RentalReminderEventType.DUE,
      dueDate: rentDueDate,
      scheduledFor,
      groupKey: dueGroupKey,
      occurrenceSetHash: computeOccurrenceSetHash([ids.occurrenceRent]),
      status: RentalReminderDispatchStatus.PARTIALLY_COMPLETED,
      policySnapshot,
      recipientSnapshot: {
        contactId: ids.contactRenter,
        name: 'Inquilino Fixture C4C',
      },
      contentSnapshot: dueContentSnapshot,
      firstAttemptAt: dueEmailSentAt,
      frozenAt: scheduledFor,
      completedAt: dueWhatsappFailedAt,
    },
  ];

  const dispatchOccurrences: RentalReminderDispatchOccurrenceCreateManyInput[] =
    [
      {
        tenantId,
        dispatchId: ids.dispatchPredue,
        occurrenceId: ids.occurrenceExpenses,
        status: RentalReminderDispatchOccurrenceStatus.INCLUDED,
        evaluatedAt: scheduledFor,
      },
      {
        tenantId,
        dispatchId: ids.dispatchDue,
        occurrenceId: ids.occurrenceRent,
        status: RentalReminderDispatchOccurrenceStatus.INCLUDED,
        evaluatedAt: scheduledFor,
      },
    ];

  const delivered = {
    status: RentalReminderDeliveryStatus.DELIVERED,
    statusSource: RentalReminderStatusSource.INTERNAL,
  };
  const failedFixtureError = {
    errorCategory: 'FIXTURE_SIMULATED',
    errorCode: 'FX_SIMULATED_REJECTION',
    errorMessage:
      'Rechazo simulado por el fixture C4C para UAT visual; sin evidencia real de provider.',
  };

  const deliveries: RentalReminderDeliveryCreateManyInput[] = [
    {
      id: ids.deliveryPredueEmail,
      tenantId,
      dispatchId: ids.dispatchPredue,
      channel: NotificationChannel.EMAIL,
      contactPointId: ids.contactPointRenterEmail,
      routeId: ids.routeRenterEmail,
      deliveryKey: deliveryKeys.predueEmail,
      ...delivered,
      destinationSnapshot: 'renter.fixture@demo.valorar.dev',
      contentSnapshot: predueContentSnapshot,
      subjectSnapshot: 'Recordatorio de vencimiento de expensas',
      bodySnapshot: 'Fixture C4C: vence Expensas ALQ-000001.',
      templateKey: 'rental-reminder',
      templateVersion: '1',
      providerKey: 'mailersend',
      providerAccountKey: 'platform-default',
      attemptCount: 1,
      sentAt: predueEmailSentAt,
      deliveredAt: predueEmailDeliveredAt,
      readAt: null,
      failedAt: null,
      providerMessageId: null,
      errorCategory: null,
      errorCode: null,
      errorMessage: null,
    },
    {
      id: ids.deliveryPredueWhatsapp,
      tenantId,
      dispatchId: ids.dispatchPredue,
      channel: NotificationChannel.WHATSAPP,
      contactPointId: ids.contactPointRenterWhatsapp,
      routeId: ids.routeRenterWhatsapp,
      deliveryKey: deliveryKeys.predueWhatsapp,
      ...delivered,
      destinationSnapshot: '+54 9 11 5555 0000',
      contentSnapshot: predueContentSnapshot,
      subjectSnapshot: null,
      bodySnapshot: 'Fixture C4C: vencen Expensas el 26/09.',
      templateKey: 'rental-reminder',
      templateVersion: '1',
      providerKey: 'meta-whatsapp',
      providerAccountKey: 'platform-default',
      attemptCount: 1,
      sentAt: predueWhatsappSentAt,
      deliveredAt: predueWhatsappDeliveredAt,
      readAt: null,
      failedAt: null,
      providerMessageId: null,
      errorCategory: null,
      errorCode: null,
      errorMessage: null,
    },
    {
      id: ids.deliveryDueEmail,
      tenantId,
      dispatchId: ids.dispatchDue,
      channel: NotificationChannel.EMAIL,
      contactPointId: ids.contactPointRenterEmail,
      routeId: ids.routeRenterEmail,
      deliveryKey: deliveryKeys.dueEmail,
      status: RentalReminderDeliveryStatus.SENT,
      statusSource: RentalReminderStatusSource.INTERNAL,
      destinationSnapshot: 'renter.fixture@demo.valorar.dev',
      contentSnapshot: dueContentSnapshot,
      subjectSnapshot: 'Recordatorio de vencimiento de alquiler',
      bodySnapshot: 'Fixture C4C: vence Alquiler ALQ-000001.',
      templateKey: 'rental-reminder',
      templateVersion: '1',
      providerKey: 'mailersend',
      providerAccountKey: 'platform-default',
      attemptCount: 1,
      sentAt: dueEmailSentAt,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
      providerMessageId: null,
      errorCategory: null,
      errorCode: null,
      errorMessage: null,
    },
    {
      id: ids.deliveryDueWhatsapp,
      tenantId,
      dispatchId: ids.dispatchDue,
      channel: NotificationChannel.WHATSAPP,
      contactPointId: ids.contactPointRenterWhatsapp,
      routeId: ids.routeRenterWhatsapp,
      deliveryKey: deliveryKeys.dueWhatsapp,
      status: RentalReminderDeliveryStatus.FAILED,
      statusSource: RentalReminderStatusSource.INTERNAL,
      destinationSnapshot: '+54 9 11 5555 0000',
      contentSnapshot: dueContentSnapshot,
      subjectSnapshot: null,
      bodySnapshot: 'Fixture C4C: vence Alquiler hoy.',
      templateKey: 'rental-reminder',
      templateVersion: '1',
      providerKey: 'meta-whatsapp',
      providerAccountKey: 'platform-default',
      attemptCount: 1,
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: dueWhatsappFailedAt,
      providerMessageId: null,
      ...failedFixtureError,
    },
  ];

  const attempts: RentalReminderDeliveryAttemptCreateManyInput[] = [
    {
      id: ids.attemptPredueEmail,
      tenantId,
      deliveryId: ids.deliveryPredueEmail,
      attemptNumber: 1,
      attemptKey: attemptKeys.predueEmail,
      status: RentalReminderAttemptStatus.ACCEPTED,
      startedAt: localDayAt(today, 600, 15, timeZone),
      finishedAt: predueEmailSentAt,
      latencyMs: 30_000,
      providerMessageId: null,
      errorCategory: null,
      errorCode: null,
      errorMessage: null,
    },
    {
      id: ids.attemptPredueWhatsapp,
      tenantId,
      deliveryId: ids.deliveryPredueWhatsapp,
      attemptNumber: 1,
      attemptKey: attemptKeys.predueWhatsapp,
      status: RentalReminderAttemptStatus.ACCEPTED,
      startedAt: localDayAt(today, 600, 45, timeZone),
      finishedAt: predueWhatsappSentAt,
      latencyMs: 15_000,
      providerMessageId: null,
      errorCategory: null,
      errorCode: null,
      errorMessage: null,
    },
    {
      id: ids.attemptDueEmail,
      tenantId,
      deliveryId: ids.deliveryDueEmail,
      attemptNumber: 1,
      attemptKey: attemptKeys.dueEmail,
      status: RentalReminderAttemptStatus.ACCEPTED,
      startedAt: localDayAt(today, 602, 15, timeZone),
      finishedAt: dueEmailSentAt,
      latencyMs: 15_000,
      providerMessageId: null,
      errorCategory: null,
      errorCode: null,
      errorMessage: null,
    },
    {
      id: ids.attemptDueWhatsapp,
      tenantId,
      deliveryId: ids.deliveryDueWhatsapp,
      attemptNumber: 1,
      attemptKey: attemptKeys.dueWhatsapp,
      status: RentalReminderAttemptStatus.FAILED,
      startedAt: localDayAt(today, 603, 15, timeZone),
      finishedAt: dueWhatsappFailedAt,
      latencyMs: 15_000,
      providerMessageId: null,
      ...failedFixtureError,
    },
  ];

  const planningIssue: RentalReminderPlanningIssueUncheckedCreateInput = {
    id: ids.issueCorenter,
    tenantId,
    contractId: ids.contract,
    occurrenceId: ids.occurrenceRent,
    recipientContactId: ids.contactCorenter,
    channel: null,
    type: RentalReminderPlanningIssueType.NO_ENABLED_ROUTE,
    deduplicationKey: computePlanningIssueKey({
      tenantId,
      contractId: ids.contract,
      occurrenceId: ids.occurrenceRent,
      recipientContactId: ids.contactCorenter,
      type: RentalReminderPlanningIssueType.NO_ENABLED_ROUTE,
    }),
    status: RentalReminderPlanningIssueStatus.OPEN,
    firstDetectedAt: issueDetectedAt,
    lastDetectedAt: issueDetectedAt,
    metadata: { reason: 'NO_ENABLED_OPERATIONAL_ROUTE' },
  };

  const inbound: CommunicationInboundMessageCreateManyInput[] = [
    {
      id: ids.inbound1,
      tenantId,
      providerKey: 'meta-whatsapp',
      providerAccountKey: 'platform-default',
      channel: NotificationChannel.WHATSAPP,
      providerMessageId: 'fx-wamid-0001',
      senderAddress: '+5491155550000',
      messageType: 'text',
      body: 'Pago mañana',
      metadata: { fixture: 'fx-c4c', synthetic: true },
      receivedAt: inbound1ReceivedAt,
      contactPointId: ids.contactPointRenterWhatsapp,
      contactId: ids.contactRenter,
      contractId: ids.contract,
      deliveryId: null,
      readAt: null,
      acknowledgedAt: null,
      acknowledgedById: null,
    },
    {
      id: ids.inbound2,
      tenantId,
      providerKey: 'meta-whatsapp',
      providerAccountKey: 'platform-default',
      channel: NotificationChannel.WHATSAPP,
      providerMessageId: 'fx-wamid-0002',
      senderAddress: '+5491155550000',
      messageType: 'text',
      body: 'Ya realicé el pago',
      metadata: { fixture: 'fx-c4c', synthetic: true },
      receivedAt: inbound2ReceivedAt,
      contactPointId: ids.contactPointRenterWhatsapp,
      contactId: ids.contactRenter,
      contractId: ids.contract,
      deliveryId: null,
      readAt: inbound2ReadAt,
      acknowledgedAt: inbound2AcknowledgedAt,
      acknowledgedById: adminUserId,
    },
    {
      id: ids.inbound3,
      tenantId,
      providerKey: 'meta-whatsapp',
      providerAccountKey: 'platform-default',
      channel: NotificationChannel.WHATSAPP,
      providerMessageId: 'fx-wamid-0003',
      senderAddress: '+5491155550000',
      messageType: 'text',
      body: 'Gracias por el aviso',
      metadata: { fixture: 'fx-c4c', synthetic: true },
      receivedAt: inbound3ReceivedAt,
      contactPointId: ids.contactPointRenterWhatsapp,
      contactId: ids.contactRenter,
      contractId: ids.contract,
      // Correlacionada de verdad con el delivery WHATSAPP PRE_DUE: valida que
      // el historial sólo cuenta respuestas ligadas por deliveryId.
      deliveryId: ids.deliveryPredueWhatsapp,
      readAt: null,
      acknowledgedAt: null,
      acknowledgedById: null,
    },
  ];

  const plan: RentalCommunicationsFixturePlan = {
    tenantId,
    adminUserId,
    now,
    timeZone,
    from,
    to,
    contractId: ids.contract,
    fixtureIds: {
      contactIds: [ids.contactRenter, ids.contactCorenter],
      contactPointIds: [
        ids.contactPointRenterEmail,
        ids.contactPointRenterWhatsapp,
      ],
      conceptIds: [ids.conceptRent, ids.conceptExpenses],
      contractIds: [ids.contract],
      partyIds: [ids.partyRenter, ids.partyCorenter],
      routeIds: [ids.routeRenterEmail, ids.routeRenterWhatsapp],
      obligationIds: [ids.obligationRent, ids.obligationExpenses],
      occurrenceIds: [ids.occurrenceRent, ids.occurrenceExpenses],
      dispatchIds: [ids.dispatchPredue, ids.dispatchDue],
      deliveryIds: [
        ids.deliveryPredueEmail,
        ids.deliveryPredueWhatsapp,
        ids.deliveryDueEmail,
        ids.deliveryDueWhatsapp,
      ],
      attemptIds: [
        ids.attemptPredueEmail,
        ids.attemptPredueWhatsapp,
        ids.attemptDueEmail,
        ids.attemptDueWhatsapp,
      ],
      issueIds: [ids.issueCorenter],
      inboundIds: [ids.inbound1, ids.inbound2, ids.inbound3],
    },
    policy,
    policySnapshot,
    tenantSettingTimeZone: timeZone,
    sequenceLastValue: 1,
    concepts,
    contacts,
    contactPoints,
    contract,
    parties,
    routes,
    obligations,
    occurrences,
    dispatches,
    dispatchOccurrences,
    deliveries,
    attempts,
    planningIssue,
    inbound,
    expectedSummary,
  };

  return plan;
}
