import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContactPointType } from '../../../../generated/prisma/client';
import {
  CreateContactPointDto,
  UpdateContactPointDto,
} from '../dto/contact-point.dto';
import { ContactResponseDto } from '../dto/contact-response.dto';
import { CreateContactDto } from '../dto/create-contact.dto';
import { ListContactsQueryDto } from '../dto/contact-query.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import {
  ContactRepository,
  type ContactPointRecord,
} from '../repositories/contact.repository';
import { normalizeContactPointValue } from '../utils/contact-point-normalization';

@Injectable()
export class ContactService {
  constructor(private readonly contactRepository: ContactRepository) {}

  async create(
    tenantId: string,
    dto: CreateContactDto,
  ): Promise<ContactResponseDto> {
    this.assertPointDefaults(dto.contactPoints ?? []);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Contact name is required');

    const contact = await this.contactRepository.create({
      tenantId,
      name,
      documentType: this.normalizeOptionalText(dto.documentType),
      documentNumber: this.normalizeOptionalText(dto.documentNumber),
      notes: this.normalizeOptionalText(dto.notes),
      isActive: dto.isActive ?? true,
      contactPoints: dto.contactPoints?.length
        ? {
            create: dto.contactPoints.map((point) =>
              this.toPointCreateData(point, tenantId),
            ),
          }
        : undefined,
    });

    return ContactResponseDto.fromEntity(contact);
  }

  async findAll(
    tenantId: string,
    query: ListContactsQueryDto,
  ): Promise<ContactResponseDto[]> {
    const contacts = await this.contactRepository.findMany(tenantId, {
      search: query.search?.trim(),
      isActive: query.isActive,
    });

    return contacts.map((contact) => ContactResponseDto.fromEntity(contact));
  }

  async findOne(id: string, tenantId: string): Promise<ContactResponseDto> {
    const contact = await this.requireContact(id, tenantId);
    return ContactResponseDto.fromEntity(contact);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateContactDto,
  ): Promise<ContactResponseDto> {
    await this.requireContact(id, tenantId);
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Contact name is required');
    }

    const updated = await this.contactRepository.update(id, tenantId, {
      ...(name !== undefined ? { name } : {}),
      ...(dto.documentType !== undefined
        ? { documentType: this.normalizeOptionalText(dto.documentType) }
        : {}),
      ...(dto.documentNumber !== undefined
        ? { documentNumber: this.normalizeOptionalText(dto.documentNumber) }
        : {}),
      ...(dto.notes !== undefined
        ? { notes: this.normalizeOptionalText(dto.notes) }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });

    if (!updated) {
      throw new NotFoundException(`Contact with id "${id}" not found`);
    }

    return ContactResponseDto.fromEntity(updated);
  }

  async addPoint(
    contactId: string,
    tenantId: string,
    dto: CreateContactPointDto,
  ): Promise<ContactPointRecord> {
    const contact = await this.requireContact(contactId, tenantId);
    if (!contact.isActive) {
      throw new BadRequestException(
        'Cannot add a point to an inactive contact',
      );
    }

    this.assertPointCapabilities(dto);

    return this.contactRepository.createPoint(
      { ...this.toPointCreateData(dto, tenantId), contactId },
      dto.isDefault === true,
    );
  }

  async updatePoint(
    contactId: string,
    pointId: string,
    tenantId: string,
    dto: UpdateContactPointDto,
  ): Promise<ContactPointRecord> {
    await this.requireContact(contactId, tenantId);
    const existing = await this.contactRepository.findPointById(
      pointId,
      contactId,
      tenantId,
    );

    if (!existing) {
      throw new NotFoundException(
        `Contact point with id "${pointId}" not found`,
      );
    }

    const effectiveActive = dto.isActive ?? existing.isActive;
    if (dto.isDefault === true && !effectiveActive) {
      throw new BadRequestException(
        'An inactive contact point cannot be default',
      );
    }

    this.assertPointCapabilities({
      type: existing.type,
      value: dto.value ?? existing.value,
      canReceiveSms: dto.canReceiveSms ?? existing.canReceiveSms,
      canReceiveWhatsapp: dto.canReceiveWhatsapp ?? existing.canReceiveWhatsapp,
    });

    const updated = await this.contactRepository.updatePoint(
      pointId,
      contactId,
      tenantId,
      existing.type,
      {
        ...(dto.value !== undefined
          ? {
              value: dto.value.trim(),
              normalizedValue: normalizeContactPointValue(
                existing.type,
                dto.value,
              ),
            }
          : {}),
        ...(dto.label !== undefined
          ? { label: this.normalizeOptionalText(dto.label) }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.isDefault !== undefined
          ? { isDefault: dto.isActive === false ? false : dto.isDefault }
          : dto.isActive === false
            ? { isDefault: false }
            : {}),
        ...(dto.canReceiveSms !== undefined
          ? { canReceiveSms: dto.canReceiveSms }
          : {}),
        ...(dto.canReceiveWhatsapp !== undefined
          ? { canReceiveWhatsapp: dto.canReceiveWhatsapp }
          : {}),
      },
      dto.isDefault === true,
    );

    if (!updated) {
      throw new NotFoundException(
        `Contact point with id "${pointId}" not found`,
      );
    }

    return updated;
  }

  async markPointDefault(
    contactId: string,
    pointId: string,
    tenantId: string,
  ): Promise<ContactPointRecord> {
    return this.updatePoint(contactId, pointId, tenantId, { isDefault: true });
  }

  private async requireContact(id: string, tenantId: string) {
    const contact = await this.contactRepository.findById(id, tenantId);
    if (!contact) {
      throw new NotFoundException(`Contact with id "${id}" not found`);
    }
    return contact;
  }

  private toPointCreateData(point: CreateContactPointDto, tenantId: string) {
    this.assertPointCapabilities(point);
    if (point.isDefault === true && point.isActive === false) {
      throw new BadRequestException(
        'An inactive contact point cannot be default',
      );
    }
    return {
      tenantId,
      type: point.type,
      value: point.value.trim(),
      normalizedValue: normalizeContactPointValue(point.type, point.value),
      label: this.normalizeOptionalText(point.label),
      isDefault: point.isDefault ?? false,
      isActive: point.isActive ?? true,
      canReceiveSms: point.canReceiveSms ?? false,
      canReceiveWhatsapp: point.canReceiveWhatsapp ?? false,
    };
  }

  private assertPointDefaults(points: CreateContactPointDto[]): void {
    for (const type of [ContactPointType.EMAIL, ContactPointType.PHONE]) {
      if (
        points.filter((point) => point.type === type && point.isDefault)
          .length > 1
      ) {
        throw new BadRequestException(
          `Only one default ${type.toLowerCase()} is allowed per contact`,
        );
      }
    }
  }

  private assertPointCapabilities(
    point: Pick<
      CreateContactPointDto,
      'type' | 'value' | 'canReceiveSms' | 'canReceiveWhatsapp'
    >,
  ): void {
    normalizeContactPointValue(point.type, point.value);
    if (
      point.type === ContactPointType.EMAIL &&
      (point.canReceiveSms || point.canReceiveWhatsapp)
    ) {
      throw new BadRequestException(
        'Email contact points cannot receive SMS or WhatsApp',
      );
    }
  }

  private normalizeOptionalText(
    value: string | undefined,
  ): string | null | undefined {
    if (value === undefined) return undefined;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
