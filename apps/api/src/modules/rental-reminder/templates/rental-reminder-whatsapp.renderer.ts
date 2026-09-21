import { Injectable } from '@nestjs/common';
import type { LogicalReminderOccurrence } from './rental-reminder-email.renderer';

export type MetaWhatsAppTemplateSelection = {
  name: string;
  languageCode: string;
  parameterMode: 'NONE' | 'RENTAL_V1';
};

export type RentalReminderWhatsAppRenderInput = {
  recipientName: string;
  contractNumber: string;
  eventType: string;
  dueDate: string;
  occurrences: LogicalReminderOccurrence[];
  template: MetaWhatsAppTemplateSelection;
};

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
};

const formatAmount = (amount: string, currency: string) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount));

@Injectable()
export class RentalReminderWhatsAppRenderer {
  render(input: RentalReminderWhatsAppRenderInput) {
    const recipientName = input.recipientName.trim() || 'inquilino/a';
    const obligations = input.occurrences.map((item) => {
      const amount =
        item.showAmount && item.amount !== null
          ? `, ${formatAmount(item.amount, item.currency)}`
          : '';
      return `${item.conceptName}: ${formatDate(item.dueDate)}${amount}`;
    });
    const body = [
      `Destinatario: ${recipientName}`,
      `Contrato: ${input.contractNumber}`,
      `Obligaciones: ${obligations.join('; ')}`,
      'Ante cualquier duda, contactate con la inmobiliaria.',
    ].join('\n');
    const parameters =
      input.template.parameterMode === 'RENTAL_V1'
        ? [recipientName, input.contractNumber, obligations.join('; ')]
        : [];
    return {
      subject: null,
      body,
      text: body,
      parameters,
      providerTemplateRef: input.template.name,
      providerTemplate: {
        reference: input.template.name,
        languageCode: input.template.languageCode,
        parameters,
      },
      contentSnapshot: {
        version: 1,
        renderState: 'RENDERED',
        eventType: input.eventType,
        dueDate: input.dueDate,
        contractNumber: input.contractNumber,
        occurrenceIds: input.occurrences
          .map((item) => item.occurrenceId)
          .sort(),
        occurrences: input.occurrences,
        text: body,
        providerTemplate: {
          reference: input.template.name,
          languageCode: input.template.languageCode,
          parameters,
          parameterMode: input.template.parameterMode,
        },
      },
      templateKey: 'rental-reminder-whatsapp',
      templateVersion: '1',
    } as const;
  }
}
