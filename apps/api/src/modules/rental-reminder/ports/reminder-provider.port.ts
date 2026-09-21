import type { NotificationChannel } from '../../../../generated/prisma/client';

export type ReminderDeliverySnapshot = {
  deliveryId: string;
  channel: Extract<NotificationChannel, 'EMAIL' | 'WHATSAPP'>;
  destination: string;
  subject: string | null;
  body: string;
  templateKey: string;
  templateVersion: string;
  providerTemplateRef: string | null;
};

export type ReminderProviderResult =
  | { accepted: true; providerMessageId: string }
  | {
      accepted: false;
      retryable: boolean;
      errorCategory: string;
      errorCode: string | null;
      errorMessage: string;
    };

export interface ReminderProviderAdapter {
  readonly providerKey: string;
  readonly channel: Extract<NotificationChannel, 'EMAIL' | 'WHATSAPP'>;
  send(
    snapshot: ReminderDeliverySnapshot,
    idempotencyKey: string,
  ): Promise<ReminderProviderResult>;
}

export type ReminderTemplateDescriptor = {
  channel: Extract<NotificationChannel, 'EMAIL' | 'WHATSAPP'>;
  templateKey: string;
  templateVersion: string;
  providerTemplateRef: string | null;
};

export interface ReminderTemplateCatalog {
  resolve(channel: NotificationChannel): ReminderTemplateDescriptor | null;
}
