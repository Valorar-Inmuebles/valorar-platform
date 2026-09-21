jest.mock('../../../../generated/prisma/client', () => ({
  ContactPointType: { EMAIL: 'EMAIL', PHONE: 'PHONE' },
  NotificationChannel: { WHATSAPP: 'WHATSAPP' },
  RentalReminderEventType: {
    PRE_DUE: 'PRE_DUE',
    DUE: 'DUE',
    POST_DUE: 'POST_DUE',
  },
  RentalReminderPlanningIssueType: {
    DUE_DATE_MISSING: 'DUE_DATE_MISSING',
    DISPLAY_AMOUNT_MISSING: 'DISPLAY_AMOUNT_MISSING',
    NO_ENABLED_ROUTE: 'NO_ENABLED_ROUTE',
    CONTACT_POINT_INELIGIBLE: 'CONTACT_POINT_INELIGIBLE',
    TENANT_TIME_ZONE_MISSING_OR_INVALID: 'TENANT_TIME_ZONE_MISSING_OR_INVALID',
    PLANNING_WINDOW_EXPIRED: 'PLANNING_WINDOW_EXPIRED',
  },
}));
jest.mock('../repositories/rental-reminder.repository', () => ({
  RentalReminderRepository: class {},
}));
jest.mock('./reminder-delivery-orchestrator.service', () => ({
  ReminderDeliveryOrchestratorService: class {},
}));

import { ReminderWhatsAppProcessorService } from './reminder-whatsapp-processor.service';

const now = new Date('2026-10-10T13:00:00.000Z');
const template = {
  name: 'rental_due_v1',
  languageCode: 'es_AR',
  parameterMode: 'RENTAL_V1' as const,
};
const delivery = {
  id: 'd1',
  tenantId: 't1',
  channel: 'WHATSAPP',
  attemptCount: 0,
  destinationSnapshot: '+5491155550000',
  deliveryKey: 'key',
  providerTemplateRef: null,
  subjectSnapshot: null,
  bodySnapshot: '',
  templateKey: 'old',
  templateVersion: 'old',
  contentSnapshot: { eventType: 'DUE', dueDate: '2026-10-10', occurrences: [] },
  dispatch: {
    recipientSnapshot: { name: 'Ana' },
    contract: { internalNumber: 'ALQ-1' },
  },
};

describe('ReminderWhatsAppProcessorService', () => {
  it('creates the attempt before Meta and accepts the provider message ID', async () => {
    const repository = {
      findClaimedDelivery: jest.fn().mockResolvedValue(delivery),
      createDeliveryAttempt: jest.fn().mockResolvedValue({
        id: 'a1',
        attemptNumber: 1,
      }),
      acceptDeliveryAttempt: jest.fn().mockResolvedValue(true),
    };
    const orchestrator = {
      claimNext: jest.fn().mockResolvedValue({
        disposition: 'CLAIMED',
        leaseToken: 'lease',
      }),
    };
    const renderer = {
      render: jest.fn().mockReturnValue({
        body: 'body',
        text: 'body',
        parameters: ['Ana', 'ALQ-1', 'Alquiler'],
        providerTemplateRef: 'rental_due_v1',
        providerTemplate: {
          reference: 'rental_due_v1',
          languageCode: 'es_AR',
          parameters: ['Ana', 'ALQ-1', 'Alquiler'],
        },
        contentSnapshot: { providerTemplate: {} },
        templateKey: 'rental-reminder-whatsapp',
        templateVersion: '1',
      }),
    };
    const provider = {
      send: jest.fn().mockResolvedValue({
        accepted: true,
        providerMessageId: 'wamid.1',
      }),
    };
    const service = new ReminderWhatsAppProcessorService(
      repository as never,
      orchestrator as never,
      renderer,
      provider as never,
    );
    await expect(
      service.processOne('t1', 'd1', now, template),
    ).resolves.toMatchObject({
      disposition: 'ACCEPTED',
      providerMessageId: 'wamid.1',
    });
    expect(
      repository.createDeliveryAttempt.mock.invocationCallOrder[0],
    ).toBeLessThan(provider.send.mock.invocationCallOrder[0]);
    expect(repository.createDeliveryAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ providerTemplateRef: 'rental_due_v1' }),
    );
  });

  it('does not call Meta when revalidation skips', async () => {
    const orchestrator = {
      claimNext: jest.fn().mockResolvedValue({ disposition: 'SKIPPED' }),
    };
    const provider = { send: jest.fn() };
    const service = new ReminderWhatsAppProcessorService(
      {} as never,
      orchestrator as never,
      {} as never,
      provider as never,
    );
    await expect(
      service.processOne('t1', 'd1', now, template),
    ).resolves.toMatchObject({ disposition: 'SKIPPED' });
    expect(provider.send).not.toHaveBeenCalled();
  });
});
