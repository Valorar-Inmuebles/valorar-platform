import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { RentalReminderDeliveryStatus } from '../../../../generated/prisma/client';
import {
  META_WHATSAPP_PROVIDER_ACCOUNT_KEY,
  META_WHATSAPP_PROVIDER_KEY,
  getMetaWhatsAppConfig,
} from '../config/meta-whatsapp.config';
import { RentalReminderRepository } from '../repositories/rental-reminder.repository';
import { CommunicationInboundService } from './communication-inbound.service';

type MetaStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  errors?: Array<{ code?: number }>;
};
type MetaMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  context?: { id?: string };
  text?: { body?: string };
  button?: { text?: string };
  interactive?: {
    button_reply?: { title?: string };
    list_reply?: { title?: string };
  };
  reaction?: { emoji?: string };
  image?: { caption?: string; mime_type?: string };
  video?: { caption?: string; mime_type?: string };
  audio?: { mime_type?: string };
  sticker?: { mime_type?: string };
  document?: { caption?: string; mime_type?: string; filename?: string };
};
type MetaWebhook = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        statuses?: MetaStatus[];
        messages?: MetaMessage[];
      };
    }>;
  }>;
};

@Injectable()
export class MetaWhatsAppWebhookService {
  constructor(
    private readonly reminderRepository: RentalReminderRepository,
    private readonly inboundService: CommunicationInboundService,
  ) {}

  verifySubscription(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined,
  ) {
    let expected: string;
    try {
      expected = getMetaWhatsAppConfig().webhookVerifyToken;
    } catch {
      throw new ServiceUnavailableException(
        'Meta WhatsApp webhook is not configured',
      );
    }
    if (
      mode !== 'subscribe' ||
      !challenge ||
      !this.equalSecret(token ?? '', expected)
    )
      throw new ForbiddenException('Meta WhatsApp webhook verification failed');
    return challenge;
  }

  verifySignature(signature: string | undefined, rawBody: Buffer) {
    let secret: string;
    try {
      secret = getMetaWhatsAppConfig().appSecret;
    } catch {
      throw new ServiceUnavailableException(
        'Meta WhatsApp webhook is not configured',
      );
    }
    const received = signature?.trim().toLowerCase() ?? '';
    const expected = `sha256=${createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')}`;
    if (!this.equalSecret(received, expected))
      throw new UnauthorizedException(
        'Invalid Meta WhatsApp webhook signature',
      );
  }

  async handle(rawBody: Buffer, receivedAt = new Date()) {
    let event: MetaWebhook;
    try {
      event = JSON.parse(rawBody.toString('utf8')) as MetaWebhook;
    } catch {
      throw new BadRequestException('Invalid Meta WhatsApp webhook payload');
    }
    const config = getMetaWhatsAppConfig();
    if (event.object !== 'whatsapp_business_account' || !event.entry?.length)
      throw new BadRequestException('Invalid Meta WhatsApp webhook scope');

    const changes = event.entry.flatMap((entry) => {
      if (entry.id !== config.wabaId)
        throw new UnauthorizedException('Meta WhatsApp WABA mismatch');
      return entry.changes ?? [];
    });
    for (const change of changes) {
      if (
        change.field !== 'messages' ||
        change.value?.metadata?.phone_number_id !== config.phoneNumberId
      )
        throw new UnauthorizedException('Meta WhatsApp phone scope mismatch');
    }

    const payloadDigest = createHash('sha256').update(rawBody).digest('hex');
    const result = {
      statuses: { applied: 0, ignored: 0, duplicate: 0, unmapped: 0 },
      inbound: { persisted: 0, duplicate: 0, unmapped: 0, invalid: 0 },
    };
    for (const change of changes) {
      for (const status of change.value?.statuses ?? []) {
        const normalized = this.normalizeStatus(status);
        if (!normalized) {
          result.statuses.ignored += 1;
          continue;
        }
        const applied = await this.reminderRepository.applyProviderWebhook({
          providerKey: META_WHATSAPP_PROVIDER_KEY,
          providerAccountKey: META_WHATSAPP_PROVIDER_ACCOUNT_KEY,
          providerEventKey: normalized.eventKey,
          providerMessageId: normalized.providerMessageId,
          eventType: normalized.eventType,
          providerOccurredAt: normalized.occurredAt,
          payloadDigest,
          targetStatus: normalized.targetStatus,
          errorCategory: normalized.errorCategory,
          errorCode: normalized.errorCode,
          errorMessage: normalized.errorMessage,
          processedAt: receivedAt,
        });
        const key = applied.status.toLowerCase() as
          | 'applied'
          | 'ignored'
          | 'duplicate'
          | 'unmapped';
        result.statuses[key] += 1;
      }
      for (const message of change.value?.messages ?? []) {
        const normalized = this.normalizeMessage(message);
        if (!normalized) {
          result.inbound.invalid += 1;
          continue;
        }
        const persisted = await this.inboundService.persist(normalized);
        if (persisted.status === 'PERSISTED') result.inbound.persisted += 1;
        else if (persisted.status === 'DUPLICATE')
          result.inbound.duplicate += 1;
        else result.inbound.unmapped += 1;
      }
    }
    return result;
  }

  private normalizeStatus(status: MetaStatus) {
    const providerMessageId = status.id?.trim();
    const eventType = status.status?.trim().toLowerCase();
    if (!providerMessageId || !eventType) return null;
    const occurredAt = this.timestamp(status.timestamp);
    const errorCode = status.errors?.[0]?.code;
    const targetStatus = this.targetStatus(eventType);
    return {
      providerMessageId,
      eventType,
      occurredAt,
      targetStatus,
      eventKey: createHash('sha256')
        .update(
          [
            'meta-whatsapp-status:v1',
            providerMessageId,
            eventType,
            status.timestamp ?? 'none',
            errorCode ?? 'none',
          ].join('|'),
        )
        .digest('hex'),
      errorCategory:
        targetStatus === RentalReminderDeliveryStatus.FAILED
          ? this.failedCategory(errorCode)
          : null,
      errorCode: errorCode ? `META_${errorCode}` : null,
      errorMessage:
        targetStatus === RentalReminderDeliveryStatus.FAILED
          ? 'Meta WhatsApp reported a terminal delivery failure.'
          : null,
    };
  }

  private normalizeMessage(message: MetaMessage) {
    const providerMessageId = message.id?.trim();
    const sender = message.from?.trim();
    const messageType = message.type?.trim().toLowerCase() || 'unknown';
    if (!providerMessageId || !sender) return null;
    const receivedAt = this.timestamp(message.timestamp);
    if (!receivedAt) return null;
    const body = this.messageBody(messageType, message);
    const metadata = this.mediaMetadata(messageType, message);
    return {
      providerMessageId,
      sender,
      contextMessageId: message.context?.id?.trim() || null,
      messageType,
      body,
      metadata,
      receivedAt,
    };
  }

  private messageBody(type: string, message: MetaMessage) {
    if (type === 'text') return message.text?.body?.trim() || null;
    if (type === 'button') return message.button?.text?.trim() || null;
    if (type === 'interactive')
      return (
        message.interactive?.button_reply?.title?.trim() ||
        message.interactive?.list_reply?.title?.trim() ||
        null
      );
    if (type === 'reaction') return message.reaction?.emoji?.trim() || null;
    if (type === 'image') return message.image?.caption?.trim() || null;
    if (type === 'video') return message.video?.caption?.trim() || null;
    if (type === 'document') return message.document?.caption?.trim() || null;
    return null;
  }

  private mediaMetadata(type: string, message: MetaMessage) {
    const media =
      type === 'image'
        ? message.image
        : type === 'video'
          ? message.video
          : type === 'audio'
            ? message.audio
            : type === 'sticker'
              ? message.sticker
              : type === 'document'
                ? message.document
                : null;
    if (!media) return undefined;
    const mimeType = media.mime_type?.trim();
    const filename =
      type === 'document' ? message.document?.filename?.trim() : undefined;
    if (!mimeType && !filename) return undefined;
    return {
      ...(mimeType ? { mimeType } : {}),
      ...(filename ? { filename } : {}),
    };
  }

  private targetStatus(type: string) {
    if (type === 'sent') return RentalReminderDeliveryStatus.SENT;
    if (type === 'delivered') return RentalReminderDeliveryStatus.DELIVERED;
    if (type === 'read') return RentalReminderDeliveryStatus.READ;
    if (type === 'failed') return RentalReminderDeliveryStatus.FAILED;
    return null;
  }

  private failedCategory(code: number | undefined) {
    return [131026, 131047].includes(code ?? -1)
      ? 'RECIPIENT_REJECTED'
      : 'PROVIDER_UNAVAILABLE';
  }

  private timestamp(value: string | undefined) {
    if (!value || !/^\d+$/.test(value)) return null;
    const date = new Date(Number(value) * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private equalSecret(left: string, right: string) {
    const leftBuffer = Buffer.from(left, 'utf8');
    const rightBuffer = Buffer.from(right, 'utf8');
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }
}
