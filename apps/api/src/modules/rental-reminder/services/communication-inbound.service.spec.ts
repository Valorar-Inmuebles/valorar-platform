jest.mock('../repositories/communication-inbound.repository', () => ({
  CommunicationInboundRepository: class {},
}));

import { CommunicationInboundService } from './communication-inbound.service';

const message = {
  providerMessageId: 'wamid.inbound',
  sender: '5491155550000',
  contextMessageId: null,
  messageType: 'text',
  body: 'Pago mañana',
  receivedAt: new Date('2026-10-10T13:00:00.000Z'),
};

describe('CommunicationInboundService', () => {
  it('uses an exact reply context to correlate tenant, contact, contract and delivery', async () => {
    const repository = {
      findContactPoints: jest
        .fn()
        .mockResolvedValue([
          { id: 'point-1', tenantId: 'tenant-1', contactId: 'contact-1' },
        ]),
      findOutboundByProviderMessageId: jest.fn().mockResolvedValue({
        id: 'delivery-1',
        tenantId: 'tenant-1',
        contactPointId: 'point-1',
        destinationSnapshot: '+5491155550000',
        dispatch: { contractId: 'contract-1', recipientContactId: 'contact-1' },
      }),
      findRecentDeliveries: jest.fn().mockResolvedValue([]),
      persist: jest
        .fn()
        .mockResolvedValue({ created: true, message: { id: 'm1' } }),
    };
    const service = new CommunicationInboundService(repository as never);
    await expect(
      service.persist({ ...message, contextMessageId: 'wamid.outbound' }),
    ).resolves.toMatchObject({ status: 'PERSISTED' });
    expect(repository.persist).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        contactPointId: 'point-1',
        contactId: 'contact-1',
        contractId: 'contract-1',
        deliveryId: 'delivery-1',
        body: 'Pago mañana',
      }),
    );
  });

  it('keeps ambiguous contact and contract associations null', async () => {
    const repository = {
      findContactPoints: jest.fn().mockResolvedValue([
        { id: 'point-1', tenantId: 'tenant-1', contactId: 'contact-1' },
        { id: 'point-2', tenantId: 'tenant-1', contactId: 'contact-2' },
      ]),
      findRecentDeliveries: jest.fn().mockResolvedValue([]),
      findActiveRenterContracts: jest.fn(),
      persist: jest
        .fn()
        .mockResolvedValue({ created: true, message: { id: 'm1' } }),
    };
    const service = new CommunicationInboundService(repository as never);
    await service.persist(message);
    expect(repository.persist).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        contactPointId: null,
        contactId: null,
        contractId: null,
        deliveryId: null,
      }),
    );
    expect(repository.findActiveRenterContracts).not.toHaveBeenCalled();
  });

  it('does not persist when the same phone is ambiguous across tenants', async () => {
    const repository = {
      findContactPoints: jest.fn().mockResolvedValue([
        { id: 'point-1', tenantId: 'tenant-1', contactId: 'contact-1' },
        { id: 'point-2', tenantId: 'tenant-2', contactId: 'contact-2' },
      ]),
      findRecentDeliveries: jest.fn().mockResolvedValue([]),
      persist: jest.fn(),
    };
    const service = new CommunicationInboundService(repository as never);
    await expect(service.persist(message)).resolves.toEqual({
      status: 'UNMAPPED_TENANT',
    });
    expect(repository.persist).not.toHaveBeenCalled();
  });

  it('links a contract only when the active renter contract is unique', async () => {
    const repository = {
      findContactPoints: jest
        .fn()
        .mockResolvedValue([
          { id: 'point-1', tenantId: 'tenant-1', contactId: 'contact-1' },
        ]),
      findRecentDeliveries: jest.fn().mockResolvedValue([]),
      findActiveRenterContracts: jest
        .fn()
        .mockResolvedValue([{ contractId: 'contract-1' }]),
      persist: jest
        .fn()
        .mockResolvedValue({ created: true, message: { id: 'm1' } }),
    };
    const service = new CommunicationInboundService(repository as never);
    await service.persist(message);
    expect(repository.persist).toHaveBeenCalledWith(
      expect.objectContaining({
        contactId: 'contact-1',
        contractId: 'contract-1',
      }),
    );
    expect(Object.keys(repository)).not.toContain('rentalFulfillment');
  });
});
