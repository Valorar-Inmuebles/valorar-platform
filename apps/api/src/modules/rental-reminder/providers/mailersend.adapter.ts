import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '../../../../generated/prisma/client';
import {
  MAILERSEND_API_URL,
  MAILERSEND_PROVIDER_KEY,
  getMailerSendConfig,
  type MailerSendConfig,
} from '../config/mailersend.config';
import type {
  ReminderDeliverySnapshot,
  ReminderProviderAdapter,
  ReminderProviderResult,
} from '../ports/reminder-provider.port';

@Injectable()
export class MailerSendAdapter implements ReminderProviderAdapter {
  readonly providerKey = MAILERSEND_PROVIDER_KEY;
  readonly channel = NotificationChannel.EMAIL;

  async send(
    snapshot: ReminderDeliverySnapshot,
    idempotencyKey: string,
  ): Promise<ReminderProviderResult> {
    void idempotencyKey;
    let config: MailerSendConfig;
    try {
      config = getMailerSendConfig();
    } catch {
      return this.failure(
        false,
        'CONFIGURATION',
        'MAILERSEND_CONFIGURATION_MISSING',
        'MailerSend email is not configured.',
      );
    }
    try {
      const response = await fetch(MAILERSEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          from: { email: config.fromEmail, name: config.fromName },
          to: [{ email: snapshot.destination }],
          subject: snapshot.subject,
          html: snapshot.body,
          text: snapshot.textBody,
        }),
      });
      if (response.status === 202) {
        const id = response.headers.get('x-message-id')?.trim();
        if (id) return { accepted: true, providerMessageId: id };
        return this.failure(
          false,
          'RECIPIENT_REJECTED',
          'MAILERSEND_NO_MESSAGE_ID',
          'MailerSend did not accept a deliverable recipient.',
        );
      }
      if (response.status === 401 || response.status === 403)
        return this.failure(
          false,
          'AUTHENTICATION',
          `MAILERSEND_HTTP_${response.status}`,
          'MailerSend authentication or authorization failed.',
        );
      if (response.status === 429) {
        const seconds = Number(response.headers.get('retry-after'));
        return {
          ...this.failure(
            true,
            'RATE_LIMIT',
            'MAILERSEND_HTTP_429',
            'MailerSend rate limit reached.',
          ),
          retryAfterMs: Number.isFinite(seconds)
            ? Math.max(0, seconds * 1000)
            : undefined,
        };
      }
      if (
        response.status === 408 ||
        response.status === 421 ||
        response.status >= 500
      )
        return this.failure(
          true,
          'PROVIDER_UNAVAILABLE',
          `MAILERSEND_HTTP_${response.status}`,
          'MailerSend is temporarily unavailable.',
        );
      if (response.status === 400 || response.status === 422)
        return this.failure(
          false,
          'VALIDATION',
          `MAILERSEND_HTTP_${response.status}`,
          'MailerSend rejected the email request.',
        );
      return this.failure(
        false,
        'UNKNOWN',
        `MAILERSEND_HTTP_${response.status}`,
        'MailerSend returned an unexpected response.',
      );
    } catch {
      return this.failure(
        true,
        'NETWORK',
        'MAILERSEND_NETWORK_ERROR',
        'MailerSend could not be reached.',
      );
    }
  }

  private failure(
    retryable: boolean,
    errorCategory: string,
    errorCode: string,
    errorMessage: string,
  ): Extract<ReminderProviderResult, { accepted: false }> {
    return {
      accepted: false,
      retryable,
      errorCategory,
      errorCode,
      errorMessage,
    };
  }
}
