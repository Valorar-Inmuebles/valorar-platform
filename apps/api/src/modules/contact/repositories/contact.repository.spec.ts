jest.mock('../../../../generated/prisma/client', () => ({
  ContactPointType: { EMAIL: 'EMAIL', PHONE: 'PHONE' },
}));

jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ContactRepository } from './contact.repository';
import { ContactPointType } from '../../../../generated/prisma/client';

describe('ContactRepository tenant isolation', () => {
  it('always scopes contact lookup to the active tenant', async () => {
    const prisma = {
      contact: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const repository = new ContactRepository(prisma as never);

    await repository.findById('contact-1', 'tenant-1');

    expect(prisma.contact.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'contact-1', tenantId: 'tenant-1' },
      }),
    );
  });

  it('unsets the previous default in the same transaction', async () => {
    const point = {
      id: 'point-2',
      tenantId: 'tenant-1',
      contactId: 'contact-1',
      type: ContactPointType.PHONE,
      value: '+5491155550000',
      normalizedValue: '+5491155550000',
      label: null,
      isDefault: true,
      isActive: true,
      canReceiveSms: false,
      canReceiveWhatsapp: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const tx = {
      contactPoint: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue(point),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const repository = new ContactRepository(prisma as never);

    await repository.createPoint(
      {
        tenantId: 'tenant-1',
        contactId: 'contact-1',
        type: ContactPointType.PHONE,
        value: point.value,
        normalizedValue: point.normalizedValue,
        isDefault: true,
        isActive: true,
        canReceiveSms: false,
        canReceiveWhatsapp: true,
      },
      true,
    );

    expect(tx.contactPoint.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        contactId: 'contact-1',
        type: ContactPointType.PHONE,
        isDefault: true,
      },
      data: { isDefault: false },
    });
    expect(tx.contactPoint.create).toHaveBeenCalledTimes(1);
  });
});
