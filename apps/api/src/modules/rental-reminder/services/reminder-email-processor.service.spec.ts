jest.mock('../../../../generated/prisma/client', () => ({
  ContactPointType: { EMAIL: 'EMAIL', PHONE: 'PHONE' },
  NotificationChannel: { EMAIL: 'EMAIL', WHATSAPP: 'WHATSAPP' },
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
jest.mock('../providers/mailersend.adapter', () => ({
  MailerSendAdapter: class {},
}));
jest.mock('../templates/rental-reminder-email.renderer', () => ({
  RentalReminderEmailRenderer: class {},
}));

import { ReminderEmailProcessorService } from './reminder-email-processor.service';

const now = new Date('2026-10-10T13:00:00.000Z');
const delivery = {
  id: 'd1',
  tenantId: 't1',
  channel: 'EMAIL',
  attemptCount: 0,
  destinationSnapshot: 'allowed@example.com',
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

describe('ReminderEmailProcessorService', () => {
  it('persists snapshot/attempt before provider and accepts the message', async () => {
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
        subject: 'subject',
        html: '<p>body</p>',
        text: 'body',
        contentSnapshot: { renderState: 'RENDERED' },
        templateKey: 'rental-reminder-email',
        templateVersion: '1',
      }),
    };
    const provider = {
      send: jest.fn().mockResolvedValue({
        accepted: true,
        providerMessageId: 'message-1',
      }),
    };
    const service = new ReminderEmailProcessorService(
      repository as never,
      orchestrator as never,
      renderer,
      provider as never,
    );
    await expect(service.processOne('t1', 'd1', now)).resolves.toMatchObject({
      disposition: 'ACCEPTED',
      providerMessageId: 'message-1',
    });
    expect(
      repository.createDeliveryAttempt.mock.invocationCallOrder[0],
    ).toBeLessThan(provider.send.mock.invocationCallOrder[0]);
    expect(repository.acceptDeliveryAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't1', deliveryId: 'd1' }),
    );
  });

  it('never calls the provider when revalidation skips', async () => {
    const orchestrator = {
      claimNext: jest.fn().mockResolvedValue({
        disposition: 'SKIPPED',
        deliveryId: 'd1',
      }),
    };
    const provider = { send: jest.fn() };
    const service = new ReminderEmailProcessorService(
      {} as never,
      orchestrator as never,
      {} as never,
      provider as never,
    );
    await expect(service.processOne('t1', 'd1', now)).resolves.toMatchObject({
      disposition: 'SKIPPED',
    });
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('persists the C2 retry schedule for retryable failures', async () => {
    const repository = {
      findClaimedDelivery: jest.fn().mockResolvedValue(delivery),
      createDeliveryAttempt: jest.fn().mockResolvedValue({
        id: 'a1',
        attemptNumber: 1,
      }),
      failDeliveryAttempt: jest.fn().mockResolvedValue(true),
    };
    const orchestrator = {
      claimNext: jest.fn().mockResolvedValue({
        disposition: 'CLAIMED',
        leaseToken: 'lease',
      }),
    };
    const renderer = {
      render: jest.fn().mockReturnValue({
        subject: 's',
        html: 'h',
        text: 't',
        contentSnapshot: {},
        templateKey: 'rental-reminder-email',
        templateVersion: '1',
      }),
    };
    const provider = {
      send: jest.fn().mockResolvedValue({
        accepted: false,
        retryable: true,
        errorCategory: 'NETWORK',
        errorCode: 'NETWORK',
        errorMessage: 'Unavailable',
      }),
    };
    const service = new ReminderEmailProcessorService(
      repository as never,
      orchestrator as never,
      renderer,
      provider as never,
    );
    await expect(service.processOne('t1', 'd1', now)).resolves.toMatchObject({
      disposition: 'RETRY_SCHEDULED',
    });
    expect(repository.failDeliveryAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ retryAt: expect.any(Date) as unknown }),
    );
  });
});
