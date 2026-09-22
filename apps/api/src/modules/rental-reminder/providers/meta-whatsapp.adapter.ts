import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '../../../../generated/prisma/client';
import {
  META_WHATSAPP_PROVIDER_KEY,
  getMetaWhatsAppConfig,
  type MetaWhatsAppConfig,
} from '../config/meta-whatsapp.config';
import {
  MetaWhatsAppRecipientError,
  toMetaWhatsAppRecipient,
} from './meta-whatsapp-recipient';
import type {
  ReminderDeliverySnapshot,
  ReminderProviderAdapter,
  ReminderProviderResult,
} from '../ports/reminder-provider.port';

type MetaErrorResponse = { error?: { code?: number; error_subcode?: number } };
type MetaSuccessResponse = { messages?: Array<{ id?: string }> };

@Injectable()
export class MetaWhatsAppAdapter implements ReminderProviderAdapter {
  readonly providerKey = META_WHATSAPP_PROVIDER_KEY;
  readonly channel = NotificationChannel.WHATSAPP;

  async send(
    snapshot: ReminderDeliverySnapshot,
    idempotencyKey: string,
  ): Promise<ReminderProviderResult> {
    void idempotencyKey;
    let config: MetaWhatsAppConfig;
    let recipient: string;
    try {
      config = getMetaWhatsAppConfig();
    } catch {
      return this.failure(
        false,
        'CONFIGURATION',
        'META_WHATSAPP_CONFIGURATION_INVALID',
        'Meta WhatsApp is not configured correctly.',
      );
    }
    try {
      recipient = toMetaWhatsAppRecipient(snapshot.destination);
    } catch (error) {
      if (error instanceof MetaWhatsAppRecipientError)
        return this.failure(
          false,
          'VALIDATION',
          'META_WHATSAPP_RECIPIENT_INVALID',
          'Meta WhatsApp recipient failed validation.',
        );
      return this.failure(
        false,
        'CONFIGURATION',
        'META_WHATSAPP_CONFIGURATION_INVALID',
        'Meta WhatsApp is not configured correctly.',
      );
    }
    const template = snapshot.providerTemplate;
    if (
      !template?.reference.trim() ||
      !/^[a-z][a-z0-9_]*$/.test(template.reference) ||
      !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(template.languageCode)
    )
      return this.failure(
        false,
        'CONFIGURATION',
        'META_WHATSAPP_TEMPLATE_INVALID',
        'Meta WhatsApp template configuration is invalid.',
      );

    const components = template.parameters.length
      ? [
          {
            type: 'body',
            parameters: template.parameters.map((text) => ({
              type: 'text',
              text,
            })),
          },
        ]
      : undefined;
    try {
      const response = await fetch(
        `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipient,
            type: 'template',
            template: {
              name: template.reference,
              language: { code: template.languageCode },
              ...(components ? { components } : {}),
            },
          }),
        },
      );
      let payload: MetaErrorResponse & MetaSuccessResponse = {};
      try {
        payload = (await response.json()) as MetaErrorResponse &
          MetaSuccessResponse;
      } catch {
        payload = {};
      }
      const messageId = payload.messages?.[0]?.id?.trim();
      if (response.ok && messageId)
        return { accepted: true, providerMessageId: messageId };
      return this.classifyFailure(
        response.status,
        payload.error,
        response.headers.get('retry-after'),
      );
    } catch {
      return this.failure(
        true,
        'NETWORK',
        'META_WHATSAPP_NETWORK_ERROR',
        'Meta WhatsApp could not be reached.',
      );
    }
  }

  private classifyFailure(
    status: number,
    error: MetaErrorResponse['error'],
    retryAfter: string | null,
  ): Extract<ReminderProviderResult, { accepted: false }> {
    const code = error?.code;
    const subcode = error?.error_subcode;
    const normalizedCode = `META_${code ?? `HTTP_${status}`}${subcode ? `_${subcode}` : ''}`;
    if (status === 401 || status === 403 || code === 190)
      return this.failure(
        false,
        'AUTHENTICATION',
        normalizedCode,
        'Meta WhatsApp authentication or authorization failed.',
      );
    if (status === 429 || code === 4 || code === 80007) {
      const seconds = Number(retryAfter);
      return {
        ...this.failure(
          true,
          'RATE_LIMIT',
          normalizedCode,
          'Meta WhatsApp rate limit reached.',
        ),
        retryAfterMs: Number.isFinite(seconds)
          ? Math.max(0, seconds * 1000)
          : undefined,
      };
    }
    if (status === 408 || status >= 500)
      return this.failure(
        true,
        'PROVIDER_UNAVAILABLE',
        normalizedCode,
        'Meta WhatsApp is temporarily unavailable.',
      );
    if ([131026, 131047].includes(code ?? -1))
      return this.failure(
        false,
        'RECIPIENT_REJECTED',
        normalizedCode,
        'Meta WhatsApp rejected the recipient.',
      );
    if ([132000, 132001, 132005, 132012, 133010].includes(code ?? -1))
      return this.failure(
        false,
        'CONFIGURATION',
        normalizedCode,
        'Meta WhatsApp rejected the template or sender configuration.',
      );
    if (status === 400 || status === 422) {
      // Códigos 4xx/422 se normalizan a VALIDATION con mensaje genérico
      // sanitizado. Códigos como META_131030 no tienen semántica oficial
      // confirmada en la tabla de errores de Meta; no se les atribuye
      // significado adicional (p. ej. "ventana de sesión") y se tratan igual
      // que cualquier otro rechazo de request.
      return this.failure(
        false,
        'VALIDATION',
        normalizedCode,
        'Meta WhatsApp rejected the message request.',
      );
    }
    return this.failure(
      false,
      'UNKNOWN',
      normalizedCode,
      'Meta WhatsApp returned an unexpected response.',
    );
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
