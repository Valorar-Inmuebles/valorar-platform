import { Injectable } from '@nestjs/common';

export type LogicalReminderOccurrence = {
  occurrenceId: string;
  conceptName: string;
  dueDate: string;
  showAmount: boolean;
  amount: string | null;
  currency: string;
};
export type RentalReminderEmailRenderInput = {
  recipientName: string;
  contractNumber: string;
  eventType: string;
  dueDate: string;
  occurrences: LogicalReminderOccurrence[];
};
const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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
export class RentalReminderEmailRenderer {
  render(input: RentalReminderEmailRenderInput) {
    const name = input.recipientName.trim() || 'inquilino/a';
    const subject = `Recordatorio de vencimiento - ${input.contractNumber} - ${formatDate(input.dueDate)}`;
    const lines = input.occurrences.map((item) => {
      const amount =
        item.showAmount && item.amount !== null
          ? ` - ${formatAmount(item.amount, item.currency)}`
          : '';
      return `${item.conceptName}${amount} - vence ${formatDate(item.dueDate)}`;
    });
    const text = [
      `Hola ${name},`,
      '',
      `Te recordamos los compromisos del contrato ${input.contractNumber}:`,
      ...lines.map((line) => `- ${line}`),
      '',
      'Ante cualquier duda, contactate con la inmobiliaria.',
      '',
      'Valorar Inmuebles',
    ].join('\n');
    const list = input.occurrences
      .map((item) => {
        const amount =
          item.showAmount && item.amount !== null
            ? ` <strong>${escapeHtml(formatAmount(item.amount, item.currency))}</strong>`
            : '';
        return `<li><strong>${escapeHtml(item.conceptName)}</strong>${amount}<br>Vencimiento: ${formatDate(item.dueDate)}</li>`;
      })
      .join('');
    const html = `<html lang="es"><body><h1>Valorar Inmuebles</h1><p>Hola ${escapeHtml(name)},</p><p>Compromisos del contrato <strong>${escapeHtml(input.contractNumber)}</strong>:</p><ul>${list}</ul><p>Ante cualquier duda, contactate con la inmobiliaria.</p><p>Valorar Inmuebles</p></body></html>`;
    return {
      subject,
      html,
      text,
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
        text,
      },
      templateKey: 'rental-reminder-email',
      templateVersion: '1',
    } as const;
  }
}
