import { RentalReminderEmailRenderer } from './rental-reminder-email.renderer';

describe('RentalReminderEmailRenderer', () => {
  it('renders deterministic HTML/text and hides amounts not allowed', () => {
    const result = new RentalReminderEmailRenderer().render({
      recipientName: '<Ana>',
      contractNumber: 'ALQ-000123',
      eventType: 'DUE',
      dueDate: '2026-10-10',
      occurrences: [
        {
          occurrenceId: 'o1',
          conceptName: 'Alquiler',
          dueDate: '2026-10-10',
          showAmount: true,
          amount: '850000',
          currency: 'ARS',
        },
        {
          occurrenceId: 'o2',
          conceptName: 'Expensas',
          dueDate: '2026-10-10',
          showAmount: false,
          amount: '999999',
          currency: 'ARS',
        },
      ],
    });
    expect(result.subject).toBe(
      'Recordatorio de vencimiento - ALQ-000123 - 10/10/2026',
    );
    expect(result.html).toContain('&lt;Ana&gt;');
    expect(result.text).toContain('850.000');
    expect(result.text).not.toContain('999.999');
    expect(result.contentSnapshot).toMatchObject({
      renderState: 'RENDERED',
      occurrenceIds: ['o1', 'o2'],
    });
  });
});
