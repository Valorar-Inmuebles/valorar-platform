import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { RentalReminderDeliveryStatus } from '../../../../generated/prisma/client';
import {
  MAILERSEND_PROVIDER_ACCOUNT_KEY,
  MAILERSEND_PROVIDER_KEY,
  getMailerSendWebhookSigningSecret,
} from '../config/mailersend.config';
import { RentalReminderRepository } from '../repositories/rental-reminder.repository';

type MailerSendWebhook = {
  type?: string;
  created_at?: string;
  data?: { id?: string; message_id?: string };
};

const MAILERSEND_WEBHOOK_TEST_SECRET = 'test_Am3L1GuOIc4blLUuHqAPxxwkZaJyEk8G';

@Injectable()
export class MailerSendWebhookService {
  constructor(private readonly repository: RentalReminderRepository) {}

  verify(signature: string | undefined, rawBody: Buffer) {
    let configuredSecret: string;
    try {
      configuredSecret = getMailerSendWebhookSigningSecret();
    } catch {
      throw new ServiceUnavailableException(
        'MailerSend webhook is not configured',
      );
    }
    let validationTest = false;
    try {
      validationTest =
        (JSON.parse(rawBody.toString('utf8')) as MailerSendWebhook).type ===
        'webhook.test';
    } catch {
      validationTest = false;
    }
    const secret = validationTest
      ? MAILERSEND_WEBHOOK_TEST_SECRET
      : configuredSecret;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const received = signature?.trim().toLowerCase() ?? '';
    if (
      !/^[0-9a-f]{64}$/.test(received) ||
      !timingSafeEqual(
        Buffer.from(received, 'hex'),
        Buffer.from(expected, 'hex'),
      )
    )
      throw new UnauthorizedException('Invalid MailerSend webhook signature');
  }

  async handle(rawBody: Buffer, receivedAt = new Date()) {
    const event = JSON.parse(rawBody.toString('utf8')) as MailerSendWebhook;
    if (event.type === 'webhook.test') return { status: 'TEST' as const };
    const type = event.type ?? '';
    const eventId = event.data?.id?.trim();
    const messageId = event.data?.message_id?.trim();
    if (!type || !eventId || !messageId) return { status: 'IGNORED' as const };
    return this.repository.applyProviderWebhook({
      providerKey: MAILERSEND_PROVIDER_KEY,
      providerAccountKey: MAILERSEND_PROVIDER_ACCOUNT_KEY,
      providerEventKey: `${type}:${eventId}`,
      providerMessageId: messageId,
      eventType: type,
      providerOccurredAt: event.created_at ? new Date(event.created_at) : null,
      payloadDigest: createHash('sha256').update(rawBody).digest('hex'),
      targetStatus: this.targetStatus(type),
      processedAt: receivedAt,
    });
  }

  private targetStatus(type: string): RentalReminderDeliveryStatus | null {
    if (type === 'activity.sent') return RentalReminderDeliveryStatus.SENT;
    if (type === 'activity.delivered')
      return RentalReminderDeliveryStatus.DELIVERED;
    if (type === 'activity.opened' || type === 'activity.opened_unique')
      return RentalReminderDeliveryStatus.READ;
    if (
      [
        'activity.hard_bounced',
        'activity.suppressed',
        'activity.spam_complaint',
      ].includes(type)
    )
      return RentalReminderDeliveryStatus.FAILED;
    return null;
  }
}
