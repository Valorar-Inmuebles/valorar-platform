import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

jest.mock('../../../../generated/prisma/client', () => ({
  ContactPointType: { EMAIL: 'EMAIL', PHONE: 'PHONE' },
}));

jest.mock('../repositories/contact.repository', () => ({
  ContactRepository: class ContactRepository {},
}));

import { ContactPointType } from '../../../../generated/prisma/client';
import { ContactRepository } from '../repositories/contact.repository';
import { ContactService } from './contact.service';

const now = new Date('2026-09-09T00:00:00.000Z');

describe('ContactService', () => {
  let service: ContactService;

  const repository = {
    create: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findPointById: jest.fn(),
    createPoint: jest.fn(),
    updatePoint: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: ContactRepository, useValue: repository },
      ],
    }).compile();
    service = module.get(ContactService);
  });

  it('creates a tenant-scoped contact with multiple email and phone points', async () => {
    repository.create.mockResolvedValue({
      id: 'contact-1',
      tenantId: 'tenant-1',
      name: 'Ana Pérez',
      notes: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      contactPoints: [0, 1, 2, 3].map((index) => ({
        id: `point-${index}`,
        tenantId: 'tenant-1',
        contactId: 'contact-1',
        type: index < 2 ? ContactPointType.EMAIL : ContactPointType.PHONE,
        value: `point-${index}`,
        normalizedValue: `point-${index}`,
        label: null,
        isDefault: index === 0 || index === 2,
        isActive: true,
        canReceiveSms: false,
        canReceiveWhatsapp: false,
        createdAt: now,
        updatedAt: now,
      })),
    });

    const result = await service.create('tenant-1', {
      name: ' Ana Pérez ',
      contactPoints: [
        {
          type: ContactPointType.EMAIL,
          value: 'ANA@EXAMPLE.COM',
          isDefault: true,
        },
        { type: ContactPointType.EMAIL, value: 'ana.work@example.com' },
        {
          type: ContactPointType.PHONE,
          value: '+54 9 11 5555-0000',
          isDefault: true,
          canReceiveWhatsapp: true,
        },
        {
          type: ContactPointType.PHONE,
          value: '11 4444 0000',
          canReceiveSms: true,
        },
      ],
    });

    expect(result.name).toBe('Ana Pérez');
    expect(result.contactPoints).toHaveLength(4);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1' }),
    );
  });

  it('rejects more than one default point of the same type', async () => {
    await expect(
      service.create('tenant-1', {
        name: 'Ana',
        contactPoints: [
          {
            type: ContactPointType.EMAIL,
            value: 'one@example.com',
            isDefault: true,
          },
          {
            type: ContactPointType.EMAIL,
            value: 'two@example.com',
            isDefault: true,
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects an inactive default point', async () => {
    await expect(
      service.create('tenant-1', {
        name: 'Ana',
        contactPoints: [
          {
            type: ContactPointType.PHONE,
            value: '+54 11 5555-0000',
            isDefault: true,
            isActive: false,
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('marks a point as default using tenant and contact scope', async () => {
    repository.findById.mockResolvedValue({ id: 'contact-1', isActive: true });
    repository.findPointById.mockResolvedValue({
      id: 'point-1',
      tenantId: 'tenant-1',
      contactId: 'contact-1',
      type: ContactPointType.PHONE,
      value: '+5491155550000',
      normalizedValue: '+5491155550000',
      label: null,
      isDefault: false,
      isActive: true,
      canReceiveSms: true,
      canReceiveWhatsapp: true,
      createdAt: now,
      updatedAt: now,
    });
    repository.updatePoint.mockResolvedValue({
      id: 'point-1',
      isDefault: true,
    });

    await service.markPointDefault('contact-1', 'point-1', 'tenant-1');

    expect(repository.findPointById).toHaveBeenCalledWith(
      'point-1',
      'contact-1',
      'tenant-1',
    );
    expect(repository.updatePoint).toHaveBeenCalledWith(
      'point-1',
      'contact-1',
      'tenant-1',
      ContactPointType.PHONE,
      { isDefault: true },
      true,
    );
  });
});
