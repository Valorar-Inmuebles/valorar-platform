import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationChannel,
  Prisma,
} from '../../../../generated/prisma/client';
import type {
  RentalReminderDeliveryQueryDto,
  RentalReminderDispatchQueryDto,
  RentalReminderPageQueryDto,
  RentalReminderPlanningIssueQueryDto,
  UpdateRentalReminderPolicyDto,
} from '../dto/rental-reminder.dto';
import type {
  RentalReminderContractHistoryQueryDto,
  RentalReminderHistoryQueryDto,
  RentalReminderInboundQueryDto,
} from '../dto/rental-reminder-read-model.dto';
import { RentalReminderRepository } from '../repositories/rental-reminder.repository';
import { CommunicationInboundRepository } from '../repositories/communication-inbound.repository';
import type { InboundAttentionState } from '../repositories/communication-inbound.repository';

const DEFAULT_TIME_ZONE = 'America/Argentina/Buenos_Aires';
const DAY_MS = 24 * 60 * 60 * 1000;

type ContractHistoryDispatch = {
  id: string;
  eventType: string;
  dueDate: Date;
  scheduledFor: Date;
  status: string;
  firstAttemptAt: Date | null;
  completedAt: Date | null;
  recipientSnapshot: Prisma.JsonValue;
  deliveries: Array<{
    id: string;
    channel: NotificationChannel;
    status: string;
    statusSource: string;
    destinationSnapshot: string;
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
    failedAt: Date | null;
    skippedAt: Date | null;
    errorCategory: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    attempts: Array<{
      attemptNumber: number;
      status: string;
      startedAt: Date;
      finishedAt: Date | null;
      latencyMs: number | null;
      errorCategory: string | null;
      errorCode: string | null;
      errorMessage: string | null;
    }>;
  }>;
  occurrences: Array<{
    occurrenceId: string;
    status: string;
    exclusionReason: string | null;
    occurrence: {
      dueDate: Date | null;
      obligation: { concept: { name: string } | null };
    } | null;
  }>;
};

type InboundReadModel = {
  id: string;
  messageType: string;
  body: string | null;
  receivedAt: Date;
  senderAddress: string;
  deliveryId: string | null;
  readAt: Date | null;
  acknowledgedAt: Date | null;
  acknowledgedBy: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
  contract: { id: string; internalNumber: string } | null;
};

/**
 * Fila cruda del historial global (C4C.1): 1 dispatch con su contrato y los
 * deliveries agrupados. La correlación de respuestas usa SOLO
 * `inboundMessages` (el inner join vía `CommunicationInboundMessage.deliveryId`);
 * nunca se infiere una respuesta que no exista en la base.
 */
type HistoryDispatchRow = {
  id: string;
  eventType: string;
  dueDate: Date | null;
  scheduledFor: Date;
  status: string;
  firstAttemptAt: Date | null;
  completedAt: Date | null;
  recipientSnapshot: Prisma.JsonValue;
  contentSnapshot: Prisma.JsonValue;
  policySnapshot: Prisma.JsonValue;
  contract: { id: string; internalNumber: string };
  deliveries: Array<{
    id: string;
    channel: NotificationChannel;
    status: string;
    destinationSnapshot: string;
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
    failedAt: Date | null;
    skippedAt: Date | null;
    attemptCount: number;
    errorCategory: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    subjectSnapshot: string | null;
    bodySnapshot: string | null;
    templateKey: string | null;
    templateVersion: string | null;
    providerTemplateRef: string | null;
    attempts: Array<{
      attemptNumber: number;
      status: string;
      startedAt: Date;
      finishedAt: Date | null;
      latencyMs: number | null;
      errorCategory: string | null;
      errorCode: string | null;
      errorMessage: string | null;
    }>;
    inboundMessages: Array<{
      id: string;
      receivedAt: Date;
      body: string | null;
      senderAddress: string;
      contact: { id: string; name: string } | null;
      readAt: Date | null;
      acknowledgedAt: Date | null;
      acknowledgedBy: { id: string; name: string } | null;
    }>;
  }>;
};

/** Orden canónico de canales para la celda de canales de la fila. */
const HISTORY_CHANNEL_ORDER: NotificationChannel[] = [
  NotificationChannel.EMAIL,
  NotificationChannel.WHATSAPP,
  NotificationChannel.SMS,
];

/**
 * Returns the UTC instant of local midnight (start of day) for `timeZone`.
 * Works around date-boundary ambiguity by starting at local noon and
 * subtracting the local wall-clock time. On DST days where midnight does not
 * exist, the closest instant is returned and the 24h window still covers the
 * whole local day.
 */
function startOfLocalDay(date: Date, timeZone: string): Date {
  const dayFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [year, month, day] = dayFormatter
    .format(date)
    .split('-')
    .map((part) => Number(part));
  const noon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = timeFormatter.formatToParts(noon);
  const partValue = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');
  return new Date(
    noon.getTime() -
      partValue('hour') * 3_600_000 -
      partValue('minute') * 60_000 -
      partValue('second') * 1_000,
  );
}

@Injectable()
export class RentalReminderService {
  constructor(
    private readonly repository: RentalReminderRepository,
    private readonly inboundRepository: CommunicationInboundRepository,
  ) {}

  async getPolicy(tenantId: string) {
    const policy = await this.repository.findPolicy(tenantId);
    if (!policy)
      throw new NotFoundException('Rental reminder policy not found');
    return this.policyResponse(policy);
  }

  async updatePolicy(tenantId: string, dto: UpdateRentalReminderPolicyDto) {
    const policy = await this.repository.updatePolicy(tenantId, dto);
    if (!policy)
      throw new NotFoundException('Rental reminder policy not found');
    return this.policyResponse(policy);
  }

  async listPlanningIssues(
    tenantId: string,
    query: RentalReminderPlanningIssueQueryDto,
  ) {
    return this.toPage(
      await this.repository.findPlanningIssues(tenantId, query),
      query,
    );
  }

  async listDispatches(
    tenantId: string,
    query: RentalReminderDispatchQueryDto,
  ) {
    this.assertRangeOrder(
      'scheduledFrom',
      'scheduledTo',
      query.scheduledFrom,
      query.scheduledTo,
    );
    return this.toPage(
      await this.repository.findDispatches(tenantId, query),
      query,
    );
  }

  async listDeliveries(
    tenantId: string,
    query: RentalReminderDeliveryQueryDto,
  ) {
    this.assertRangeOrder('sentFrom', 'sentTo', query.sentFrom, query.sentTo);
    this.assertRangeOrder(
      'deliveredFrom',
      'deliveredTo',
      query.deliveredFrom,
      query.deliveredTo,
    );
    this.assertRangeOrder(
      'failedFrom',
      'failedTo',
      query.failedFrom,
      query.failedTo,
    );
    return this.toPage(
      await this.repository.findDeliveries(tenantId, query),
      query,
    );
  }

  async listAttempts(
    tenantId: string,
    deliveryId: string,
    query: RentalReminderPageQueryDto,
  ) {
    const result = await this.repository.findAttempts(
      tenantId,
      deliveryId,
      query.page,
      query.pageSize,
    );
    if (!result)
      throw new NotFoundException('Rental reminder delivery not found');
    return this.toPage(result, query);
  }

  async getContractHistory(
    tenantId: string,
    contractId: string,
    query: RentalReminderContractHistoryQueryDto,
  ) {
    const contract = await this.repository.findContractSummary(
      tenantId,
      contractId,
    );
    if (!contract) throw new NotFoundException('Rental contract not found');
    const [dispatches, total] =
      await this.repository.findContractCommunicationsHistory(
        tenantId,
        contractId,
        query,
      );
    return {
      contract: {
        id: contract.id,
        internalNumber: contract.internalNumber,
      },
      ...this.paged(
        dispatches.map((dispatch) => this.toContractHistoryItem(dispatch)),
        total,
        query,
      ),
    };
  }

  async getHistory(tenantId: string, query: RentalReminderHistoryQueryDto) {
    this.assertRangeOrder(
      'scheduledFrom',
      'scheduledTo',
      query.scheduledFrom,
      query.scheduledTo,
    );
    this.assertRangeOrder('sentFrom', 'sentTo', query.sentFrom, query.sentTo);
    this.assertRangeOrder(
      'deliveredFrom',
      'deliveredTo',
      query.deliveredFrom,
      query.deliveredTo,
    );
    this.assertRangeOrder(
      'failedFrom',
      'failedTo',
      query.failedFrom,
      query.failedTo,
    );
    const [dispatches, total] = await this.repository.findCommunicationsHistory(
      tenantId,
      query,
    );
    return this.paged(
      dispatches.map((dispatch) => this.toHistoryItem(dispatch)),
      total,
      query,
    );
  }

  async getInbound(tenantId: string, query: RentalReminderInboundQueryDto) {
    this.assertRangeOrder(
      'receivedFrom',
      'receivedTo',
      query.receivedFrom,
      query.receivedTo,
    );
    const result = await this.inboundRepository.listReadModel(tenantId, query);
    return this.paged(
      result.items.map((message: InboundReadModel) => ({
        id: message.id,
        receivedAt: message.receivedAt.toISOString(),
        messageType: message.messageType,
        body: message.body,
        sender: {
          address: this.maskDestination(
            message.senderAddress,
            NotificationChannel.WHATSAPP,
          ),
        },
        readAt: message.readAt ? message.readAt.toISOString() : null,
        acknowledgedAt: message.acknowledgedAt
          ? message.acknowledgedAt.toISOString()
          : null,
        acknowledgedBy: message.acknowledgedBy
          ? { id: message.acknowledgedBy.id, name: message.acknowledgedBy.name }
          : null,
        contact: message.contact
          ? { id: message.contact.id, name: message.contact.name }
          : null,
        contract: message.contract
          ? {
              id: message.contract.id,
              internalNumber: message.contract.internalNumber,
            }
          : null,
        deliveryCorrelated: message.deliveryId !== null,
        // Functional PII: the destination number is intentionally exposed as
        // https://wa.me/<digits> to support "Reply on WhatsApp". No other raw
        // number or provider metadata is returned, and sender.address stays
        // masked. Do not log this value.
        externalReplyLink: this.externalReplyLink(message.senderAddress),
      })),
      result.total,
      query,
    );
  }

  async getSummary(tenantId: string) {
    const timeZone = await this.resolveTenantTimeZone(tenantId);
    const now = new Date();
    const from = startOfLocalDay(now, timeZone);
    const to = new Date(from.getTime() + DAY_MS);
    const counts = await this.repository.countCommunicationsSummary(
      tenantId,
      from,
      to,
    );
    return {
      asOf: now.toISOString(),
      timeZone,
      window: { from: from.toISOString(), to: to.toISOString() },
      ...counts,
    };
  }

  async retryDelivery(tenantId: string, deliveryId: string) {
    const result = await this.repository.manualResetFailedDelivery({
      tenantId,
      deliveryId,
      now: new Date(),
    });
    if (result.ok) {
      return {
        ok: true,
        attemptCount: result.attemptCount,
        nextAttemptNumber: result.nextAttemptNumber,
        dispatchReopened: result.dispatchReopened,
      };
    }
    if (result.reason === 'NOT_FOUND') {
      throw new NotFoundException({ ok: false, reason: 'NOT_FOUND' });
    }
    throw new ConflictException({ ok: false, reason: result.reason });
  }

  /**
   * Marks an inbound message as explicitly read in Admin. Idempotent: the
   * first readAt is preserved and acknowledgedAt is never modified.
   */
  async markInboundRead(tenantId: string, messageId: string) {
    const result = await this.inboundRepository.markInboundRead({
      tenantId,
      messageId,
      now: new Date(),
    });
    if (result.status === 'NOT_FOUND') {
      throw new NotFoundException({ ok: false, reason: 'NOT_FOUND' });
    }
    return this.attentionResponse(result.message);
  }

  /**
   * Acknowledges an inbound message as resolved by the current operator.
   * Acknowledging implies read. When the message was already acknowledged the
   * existing actor/timestamp are returned untouched (no silent replacement,
   * no 409): retries and repeated UI taps stay idempotent.
   */
  async acknowledgeInbound(
    tenantId: string,
    messageId: string,
    acknowledgedById: string | null,
  ) {
    const result = await this.inboundRepository.acknowledgeInbound({
      tenantId,
      messageId,
      acknowledgedById,
      now: new Date(),
    });
    if (result.status === 'NOT_FOUND') {
      throw new NotFoundException({ ok: false, reason: 'NOT_FOUND' });
    }
    return {
      alreadyAcknowledged: result.status === 'ALREADY_ACKNOWLEDGED',
      ...this.attentionResponse(result.message),
    };
  }

  private attentionResponse(message: InboundAttentionState) {
    return {
      ok: true,
      messageId: message.id,
      readAt: message.readAt ? message.readAt.toISOString() : null,
      acknowledgedAt: message.acknowledgedAt
        ? message.acknowledgedAt.toISOString()
        : null,
      acknowledgedBy: message.acknowledgedBy
        ? { id: message.acknowledgedBy.id, name: message.acknowledgedBy.name }
        : null,
    };
  }

  private policyResponse(policy: {
    id: string;
    preDueEnabled: boolean;
    preDueDays: number;
    dueEnabled: boolean;
    postDueEnabled: boolean;
    postDueDays: number;
    sendTimeMinutes: number;
    createdAt: Date;
    updatedAt: Date;
    tenant: { settings: { timeZone: string } | null };
  }) {
    return {
      id: policy.id,
      preDueEnabled: policy.preDueEnabled,
      preDueDays: policy.preDueDays,
      dueEnabled: policy.dueEnabled,
      postDueEnabled: policy.postDueEnabled,
      postDueDays: policy.postDueDays,
      sendTimeMinutes: policy.sendTimeMinutes,
      timeZone: policy.tenant.settings?.timeZone ?? DEFAULT_TIME_ZONE,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  }

  private toContractHistoryItem(dispatch: ContractHistoryDispatch) {
    const recipient = this.recipientFromSnapshot(dispatch.recipientSnapshot);
    return {
      id: dispatch.id,
      eventType: dispatch.eventType,
      dueDate: this.toIsoDate(dispatch.dueDate),
      scheduledFor: dispatch.scheduledFor.toISOString(),
      status: dispatch.status,
      firstAttemptAt: this.toIso(dispatch.firstAttemptAt),
      completedAt: this.toIso(dispatch.completedAt),
      recipient: {
        contactId: recipient.contactId,
        name: recipient.name,
      },
      occurrences: dispatch.occurrences.map((occurrence) => ({
        occurrenceId: occurrence.occurrenceId,
        status: occurrence.status,
        exclusionReason: occurrence.exclusionReason,
        conceptName: occurrence.occurrence?.obligation?.concept?.name ?? null,
        dueDate: this.toIsoDate(occurrence.occurrence?.dueDate ?? null),
      })),
      deliveries: dispatch.deliveries.map((delivery) => ({
        id: delivery.id,
        channel: delivery.channel,
        status: delivery.status,
        statusSource: delivery.statusSource,
        destination: this.maskDestination(
          delivery.destinationSnapshot,
          delivery.channel,
        ),
        sentAt: this.toIso(delivery.sentAt),
        deliveredAt: this.toIso(delivery.deliveredAt),
        readAt: this.toIso(delivery.readAt),
        failedAt: this.toIso(delivery.failedAt),
        skippedAt: this.toIso(delivery.skippedAt),
        error: this.toSanitizedError(
          delivery.errorCategory,
          delivery.errorCode,
          delivery.errorMessage,
        ),
        attempts: delivery.attempts.map((attempt) => ({
          attemptNumber: attempt.attemptNumber,
          status: attempt.status,
          startedAt: attempt.startedAt.toISOString(),
          finishedAt: this.toIso(attempt.finishedAt),
          latencyMs: attempt.latencyMs,
          error: this.toSanitizedError(
            attempt.errorCategory,
            attempt.errorCode,
            attempt.errorMessage,
          ),
        })),
      })),
    };
  }

  /**
   * Proyecta una fila del historial global (C4C.1): conceptos y política desde
   * los snapshots congelados (nunca se reconstruye con datos actuales),
   * destinatarios enmascarados, retry eligibility por estado + intentos y
   * respuestas correlacionadas por `deliveryId`.
   */
  private toHistoryItem(dispatch: HistoryDispatchRow) {
    const recipient = this.recipientFromSnapshot(dispatch.recipientSnapshot);
    const conceptDetails = this.conceptDetailsFromSnapshot(
      dispatch.contentSnapshot,
    );
    const concepts: string[] = [];
    for (const detail of conceptDetails) {
      if (detail.conceptName && !concepts.includes(detail.conceptName)) {
        concepts.push(detail.conceptName);
      }
    }
    const deliveries = dispatch.deliveries.map((delivery) => ({
      id: delivery.id,
      channel: delivery.channel,
      status: delivery.status,
      destination: this.maskDestination(
        delivery.destinationSnapshot,
        delivery.channel,
      ),
      sentAt: this.toIso(delivery.sentAt),
      deliveredAt: this.toIso(delivery.deliveredAt),
      readAt: this.toIso(delivery.readAt),
      failedAt: this.toIso(delivery.failedAt),
      skippedAt: this.toIso(delivery.skippedAt),
      attemptCount: delivery.attemptCount,
      // Elegible a reintento: FAILED con intentos restantes bajo el máximo (4).
      retryEligible: delivery.status === 'FAILED' && delivery.attemptCount < 4,
      error: this.toSanitizedError(
        delivery.errorCategory,
        delivery.errorCode,
        delivery.errorMessage,
      ),
      attempts: delivery.attempts.map((attempt) => ({
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        startedAt: attempt.startedAt.toISOString(),
        finishedAt: this.toIso(attempt.finishedAt),
        latencyMs: attempt.latencyMs,
        error: this.toSanitizedError(
          attempt.errorCategory,
          attempt.errorCode,
          attempt.errorMessage,
        ),
      })),
      responses: delivery.inboundMessages.map((message) => ({
        id: message.id,
        receivedAt: message.receivedAt.toISOString(),
        body: message.body,
        contact: message.contact,
        externalReplyLink: this.externalReplyLink(message.senderAddress),
        readAt: this.toIso(message.readAt),
        acknowledgedAt: this.toIso(message.acknowledgedAt),
        acknowledgedBy: message.acknowledgedBy
          ? { id: message.acknowledgedBy.id, name: message.acknowledgedBy.name }
          : null,
      })),
      content: {
        subject: delivery.subjectSnapshot,
        body: delivery.bodySnapshot,
        templateKey: delivery.templateKey,
        templateVersion: delivery.templateVersion,
        templateRef: delivery.providerTemplateRef,
      },
    }));
    const responses = deliveries.flatMap((delivery) => delivery.responses);
    const channels = HISTORY_CHANNEL_ORDER.filter((channel) =>
      deliveries.some((delivery) => delivery.channel === channel),
    );
    return {
      dispatchId: dispatch.id,
      scheduledFor: dispatch.scheduledFor.toISOString(),
      eventType: dispatch.eventType,
      status: dispatch.status,
      dueDate: this.toIsoDate(dispatch.dueDate),
      firstAttemptAt: this.toIso(dispatch.firstAttemptAt),
      completedAt: this.toIso(dispatch.completedAt),
      contract: dispatch.contract,
      recipients: [recipient],
      concepts,
      conceptDetails,
      channels,
      deliveries,
      responsesCount: responses.length,
      responsesPending: responses.some(
        (response) => response.acknowledgedAt === null,
      ),
      policy: this.policyFromSnapshot(dispatch.policySnapshot),
    };
  }

  /** Conceptos congelados en contentSnapshot.occurrences (lectura defensiva). */
  private conceptDetailsFromSnapshot(snapshot: Prisma.JsonValue) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return [];
    }
    const record = snapshot as Record<string, unknown>;
    const occurrences = Array.isArray(record.occurrences)
      ? record.occurrences
      : [];
    const details: Array<{
      conceptId: string | null;
      conceptName: string | null;
      dueDate: string | null;
      amount: string | null;
      currency: string | null;
      showAmount: boolean;
    }> = [];
    for (const occurrence of occurrences) {
      if (
        !occurrence ||
        typeof occurrence !== 'object' ||
        Array.isArray(occurrence)
      ) {
        continue;
      }
      const item = occurrence as Record<string, unknown>;
      details.push({
        conceptId: typeof item.conceptId === 'string' ? item.conceptId : null,
        conceptName:
          typeof item.conceptName === 'string' ? item.conceptName : null,
        dueDate: typeof item.dueDate === 'string' ? item.dueDate : null,
        amount: typeof item.amount === 'string' ? item.amount : null,
        currency: typeof item.currency === 'string' ? item.currency : null,
        showAmount:
          typeof item.showAmount === 'boolean' ? item.showAmount : false,
      });
    }
    return details;
  }

  /**
   * Parámetros congelados de política. Proyección explícita (sólo lo mostrado
   * en el admin): nunca se expone el JSON completo ni campos provider.
   */
  private policyFromSnapshot(snapshot: Prisma.JsonValue) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return null;
    }
    const record = snapshot as Record<string, unknown>;
    return {
      timeZone: typeof record.timeZone === 'string' ? record.timeZone : null,
      preDueEnabled:
        typeof record.preDueEnabled === 'boolean'
          ? record.preDueEnabled
          : false,
      preDueDays: typeof record.preDueDays === 'number' ? record.preDueDays : 0,
      dueEnabled:
        typeof record.dueEnabled === 'boolean' ? record.dueEnabled : false,
      postDueEnabled:
        typeof record.postDueEnabled === 'boolean'
          ? record.postDueEnabled
          : false,
      postDueDays:
        typeof record.postDueDays === 'number' ? record.postDueDays : 0,
      sendTimeMinutes:
        typeof record.sendTimeMinutes === 'number' ? record.sendTimeMinutes : 0,
    };
  }

  private recipientFromSnapshot(snapshot: Prisma.JsonValue): {
    contactId: string | null;
    name: string | null;
  } {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return { contactId: null, name: null };
    }
    const record = snapshot as Record<string, unknown>;
    return {
      contactId: typeof record.contactId === 'string' ? record.contactId : null,
      name: typeof record.name === 'string' ? record.name : null,
    };
  }

  private toSanitizedError(
    category: string | null,
    code: string | null,
    message: string | null,
  ) {
    return category || code ? { category, code, message } : null;
  }

  private maskDestination(value: string, channel: string): string {
    if (channel === NotificationChannel.EMAIL) return this.maskEmail(value);
    return this.maskPhone(value);
  }

  private maskPhone(value: string): string {
    if (value.length <= 7) return '*'.repeat(value.length);
    return `${value.slice(0, 3)}${'*'.repeat(
      Math.max(4, value.length - 7),
    )}${value.slice(-4)}`;
  }

  private maskEmail(value: string): string {
    const at = value.indexOf('@');
    if (at <= 0) return this.maskPhone(value);
    return `${value.slice(0, 1)}***${value.slice(at)}`;
  }

  private externalReplyLink(senderAddress: string): string | null {
    if (!/^\+?[0-9]+$/.test(senderAddress)) return null;
    return `https://wa.me/${senderAddress.replace(/\D/g, '')}`;
  }

  private async resolveTenantTimeZone(tenantId: string): Promise<string> {
    const policy = await this.repository.findTenantTimezone(tenantId);
    return policy?.tenant.settings?.timeZone ?? DEFAULT_TIME_ZONE;
  }

  private assertRangeOrder(
    fromLabel: string,
    toLabel: string,
    from?: string,
    to?: string,
  ) {
    if (from && to && new Date(from).getTime() >= new Date(to).getTime()) {
      throw new BadRequestException(
        `${fromLabel} must be earlier than ${toLabel}.`,
      );
    }
  }

  private toIso(value: Date | null | undefined): string | null {
    return value ? value.toISOString() : null;
  }

  private toIsoDate(value: Date | null | undefined): string | null {
    return value ? value.toISOString().slice(0, 10) : null;
  }

  private paged<T>(
    items: T[],
    total: number,
    query: RentalReminderPageQueryDto,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private toPage<T>(
    [items, total]: [T[], number],
    query: RentalReminderPageQueryDto,
  ) {
    return this.paged(items, total, query);
  }
}
