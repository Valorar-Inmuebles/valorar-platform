import { RentalReminderWhatsAppRenderer } from './rental-reminder-whatsapp.renderer';

describe('RentalReminderWhatsAppRenderer', () => {
  it('renders the operational parameters and hides disabled amounts', () => {
    const rendered = new RentalReminderWhatsAppRenderer().render({
      recipientName: 'Juan Pérez',
      contractNumber: 'ALQ-000123',
      eventType: 'DUE',
      dueDate: '2026-10-10',
      occurrences: [
        {
          occurrenceId: 'o1',
          conceptName: 'Alquiler',
          dueDate: '2026-10-10',
          showAmount: true,
          amount: '120000.00',
          currency: 'ARS',
        },
        {
          occurrenceId: 'o2',
          conceptName: 'Expensas',
          dueDate: '2026-10-10',
          showAmount: false,
          amount: '45000.00',
          currency: 'ARS',
        },
      ],
      template: {
        name: 'rental_due_v1',
        languageCode: 'es_AR',
        parameterMode: 'RENTAL_V1',
      },
    });
    expect(rendered.parameters).toHaveLength(3);
    expect(rendered.parameters[2]).toContain('Alquiler');
    expect(rendered.parameters[2]).toContain('$ 120.000,00');
    expect(rendered.parameters[2]).toContain('Expensas');
    expect(rendered.parameters[2]).not.toContain('45.000');
    expect(rendered.providerTemplate).toEqual({
      reference: 'rental_due_v1',
      languageCode: 'es_AR',
      parameters: rendered.parameters,
    });
  });

  it('supports an approved development template without parameters', () => {
    const rendered = new RentalReminderWhatsAppRenderer().render({
      recipientName: 'Juan',
      contractNumber: 'ALQ-000123',
      eventType: 'DUE',
      dueDate: '2026-10-10',
      occurrences: [],
      template: {
        name: 'hello_world',
        languageCode: 'en_US',
        parameterMode: 'NONE',
      },
    });
    expect(rendered.parameters).toEqual([]);
    expect(rendered.body).toContain('ALQ-000123');
  });
});
