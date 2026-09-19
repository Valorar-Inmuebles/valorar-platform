import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationChannel,
  RentalContractPartyRole,
  RentalContractStatus,
} from '../../../../generated/prisma/client';
import {
  CreateRentalContractDto,
  type RentalContractPartyInputDto,
} from '../dto/create-rental-contract.dto';
import { RentalContractResponseDto } from '../dto/rental-contract-response.dto';
import { UpdateRentalContractDto } from '../dto/update-rental-contract.dto';
import { RentalContractRepository } from '../repositories/rental-contract.repository';
import { localDateForTimeZone } from '../../rental-obligation/utils/rental-occurrence-materializer';

@Injectable()
export class RentalContractService {
  constructor(private readonly repository: RentalContractRepository) {}

  async create(
    tenantId: string,
    createdById: string | null,
    dto: CreateRentalContractDto,
  ) {
    await this.assertReferences(tenantId, dto);
    const startsOn = this.parseDate(dto.startsOn, 'startsOn');
    const endsOn = this.parseOptionalDate(dto.endsOn, 'endsOn');
    this.assertDateRange(startsOn, endsOn);
    const address = this.addressData(dto);
    const contract = await this.repository.create(
      {
        tenantId,
        createdById,
        propertyId: dto.propertyId ?? null,
        ...address,
        startsOn,
        endsOn,
        status: RentalContractStatus.DRAFT,
        notes: this.normalizeOptionalText(dto.notes),
      },
      dto.parties ?? [],
    );
    return RentalContractResponseDto.fromEntity(contract);
  }

  async findAll(tenantId: string, status?: RentalContractStatus) {
    return (await this.repository.findMany(tenantId, status)).map((contract) =>
      RentalContractResponseDto.fromEntity(contract),
    );
  }

  async findOne(id: string, tenantId: string) {
    return RentalContractResponseDto.fromEntity(
      await this.requireContract(id, tenantId),
    );
  }

  async update(id: string, tenantId: string, dto: UpdateRentalContractDto) {
    const existing = await this.requireContract(id, tenantId);
    if (
      existing.status === RentalContractStatus.ENDED ||
      existing.status === RentalContractStatus.CANCELLED
    )
      throw new ConflictException('Terminal rental contracts cannot be edited');
    await this.assertReferences(tenantId, dto);
    if (
      existing.status === RentalContractStatus.ACTIVE &&
      dto.parties &&
      !dto.parties.some(
        (party) => party.role === RentalContractPartyRole.RENTER,
      )
    ) {
      throw new BadRequestException(
        'At least one renter is required on an active rental contract',
      );
    }
    const startsOn = dto.startsOn
      ? this.parseDate(dto.startsOn, 'startsOn')
      : existing.startsOn;
    const endsOn =
      dto.endsOn !== undefined
        ? this.parseOptionalDate(dto.endsOn, 'endsOn')
        : existing.endsOn;
    this.assertDateRange(startsOn, endsOn);
    const updated = await this.repository.update(
      id,
      tenantId,
      {
        ...(dto.propertyId !== undefined ? { propertyId: dto.propertyId } : {}),
        ...(dto.propertyStreetSnapshot !== undefined
          ? this.addressData(dto as CreateRentalContractDto)
          : {}),
        ...(dto.startsOn !== undefined ? { startsOn } : {}),
        ...(dto.endsOn !== undefined ? { endsOn } : {}),
        ...(dto.notes !== undefined
          ? { notes: this.normalizeOptionalText(dto.notes) }
          : {}),
      },
      dto.parties,
    );
    if (!updated)
      throw new NotFoundException(`Rental contract with id "${id}" not found`);
    return RentalContractResponseDto.fromEntity(updated);
  }

  activate(id: string, tenantId: string) {
    return this.transition(id, tenantId, RentalContractStatus.ACTIVE);
  }
  end(id: string, tenantId: string, actorId: string | null) {
    return this.transition(id, tenantId, RentalContractStatus.ENDED, actorId);
  }
  cancel(id: string, tenantId: string, actorId: string | null) {
    return this.transition(
      id,
      tenantId,
      RentalContractStatus.CANCELLED,
      actorId,
    );
  }

  private async transition(
    id: string,
    tenantId: string,
    target: RentalContractStatus,
    actorId: string | null = null,
  ) {
    const existing = await this.requireContract(id, tenantId);
    const allowed =
      (target === RentalContractStatus.ACTIVE &&
        existing.status === RentalContractStatus.DRAFT) ||
      (target === RentalContractStatus.ENDED &&
        existing.status === RentalContractStatus.ACTIVE) ||
      (target === RentalContractStatus.CANCELLED &&
        (existing.status === RentalContractStatus.DRAFT ||
          existing.status === RentalContractStatus.ACTIVE));
    if (!allowed)
      throw new ConflictException(
        `Rental contract cannot transition from ${existing.status} to ${target}`,
      );
    if (target === RentalContractStatus.ACTIVE) {
      if (
        !existing.parties.some(
          (party) =>
            party.role === RentalContractPartyRole.RENTER &&
            party.contact.isActive,
        )
      )
        throw new BadRequestException(
          'At least one active renter is required to activate a rental contract',
        );
      if (
        existing.propertyId &&
        !(await this.repository.propertyBelongsToTenant(
          existing.propertyId,
          tenantId,
        ))
      )
        throw new BadRequestException(
          'propertyId must reference a property in the same tenant',
        );
      if (!(await this.repository.hasActiveRentObligation(id, tenantId)))
        throw new BadRequestException(
          'An active RENT obligation is required to activate a rental contract',
        );
    }
    const updated =
      target === RentalContractStatus.ACTIVE
        ? await this.repository.activateWithRentRequirement(id, tenantId)
        : await this.repository.transitionToTerminal(
            id,
            tenantId,
            target,
            localDateForTimeZone(
              new Date(),
              await this.repository.tenantTimeZone(tenantId),
            ),
            actorId,
          );
    if (!updated)
      throw new ConflictException('Rental contract changed during transition');
    return RentalContractResponseDto.fromEntity(updated);
  }

  private async requireContract(id: string, tenantId: string) {
    const contract = await this.repository.findById(id, tenantId);
    if (!contract)
      throw new NotFoundException(`Rental contract with id "${id}" not found`);
    return contract;
  }

  private async assertReferences(
    tenantId: string,
    dto: Partial<CreateRentalContractDto>,
  ) {
    if (
      dto.propertyId &&
      !(await this.repository.propertyBelongsToTenant(dto.propertyId, tenantId))
    )
      throw new BadRequestException(
        'propertyId must reference a property in the same tenant',
      );
    await this.assertParties(tenantId, dto.parties ?? []);
  }

  private async assertParties(
    tenantId: string,
    parties: RentalContractPartyInputDto[],
  ) {
    const partyKeys = new Set<string>();
    for (const party of parties) {
      const key = `${party.role}:${party.contactId}`;
      if (partyKeys.has(key))
        throw new BadRequestException(
          'A contact cannot repeat in the same contract role',
        );
      partyKeys.add(key);
      const channels = new Set<NotificationChannel>();
      for (const route of party.notificationRoutes ?? []) {
        if (channels.has(route.channel))
          throw new BadRequestException(
            'Only one contact point per channel is allowed',
          );
        channels.add(route.channel);
      }
    }
    const ids = [...new Set(parties.map((party) => party.contactId))];
    const contacts = await this.repository.contactsByIds(ids, tenantId);
    if (contacts.length !== ids.length)
      throw new BadRequestException(
        'Every contract party must be an active contact in the same tenant',
      );
    const contactsById = new Map(
      contacts.map((contact) => [contact.id, contact]),
    );
    for (const party of parties) {
      const contact = contactsById.get(party.contactId)!;
      for (const route of party.notificationRoutes ?? []) {
        const point = contact.contactPoints.find(
          (item) => item.id === route.contactPointId && item.isActive,
        );
        if (!point)
          throw new BadRequestException(
            'Notification route must use an active point owned by the contract contact',
          );
        if (
          route.channel === NotificationChannel.EMAIL &&
          point.type !== 'EMAIL'
        )
          throw new BadRequestException(
            'Email routes require an email contact point',
          );
        if (
          route.channel === NotificationChannel.WHATSAPP &&
          (point.type !== 'PHONE' || !point.canReceiveWhatsapp)
        )
          throw new BadRequestException(
            'WhatsApp routes require a compatible phone',
          );
        if (
          route.channel === NotificationChannel.SMS &&
          (point.type !== 'PHONE' || !point.canReceiveSms)
        )
          throw new BadRequestException(
            'SMS routes require a compatible phone',
          );
      }
    }
  }

  private addressData(dto: CreateRentalContractDto) {
    const street = dto.propertyStreetSnapshot.trim();
    if (!street)
      throw new BadRequestException('propertyStreetSnapshot is required');
    const number = this.normalizeOptionalText(dto.propertyStreetNumberSnapshot);
    const floor = this.normalizeOptionalText(dto.propertyFloorSnapshot);
    const unit = this.normalizeOptionalText(dto.propertyUnitSnapshot);
    return {
      propertyAddressSnapshot: [
        street,
        number,
        floor ? `Piso ${floor}` : null,
        unit ? `Unidad ${unit}` : null,
      ]
        .filter(Boolean)
        .join(' '),
      propertyCountryId: dto.propertyCountryId ?? null,
      propertyProvinceId: dto.propertyProvinceId ?? null,
      propertyLocalityId: dto.propertyLocalityId ?? null,
      propertyNeighborhoodId: dto.propertyNeighborhoodId ?? null,
      propertyCountrySnapshot: this.normalizeOptionalText(
        dto.propertyCountrySnapshot,
      ),
      propertyProvinceSnapshot: this.normalizeOptionalText(
        dto.propertyProvinceSnapshot,
      ),
      propertyLocalitySnapshot: this.normalizeOptionalText(
        dto.propertyLocalitySnapshot,
      ),
      propertyNeighborhoodSnapshot: this.normalizeOptionalText(
        dto.propertyNeighborhoodSnapshot,
      ),
      propertyStreetSnapshot: street,
      propertyStreetNumberSnapshot: number,
      propertyFloorSnapshot: floor,
      propertyUnitSnapshot: unit,
      propertyPostalCodeSnapshot: this.normalizeOptionalText(
        dto.propertyPostalCodeSnapshot,
      ),
      propertyNotesSnapshot: this.normalizeOptionalText(
        dto.propertyNotesSnapshot,
      ),
    };
  }

  private parseDate(value: string, field: string) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    )
      throw new BadRequestException(`${field} must be a valid date`);
    return date;
  }
  private parseOptionalDate(value: string | null | undefined, field: string) {
    return value ? this.parseDate(value, field) : null;
  }
  private assertDateRange(startsOn: Date, endsOn: Date | null) {
    if (endsOn && endsOn < startsOn)
      throw new BadRequestException('endsOn must not be before startsOn');
  }
  private normalizeOptionalText(
    value: string | null | undefined,
  ): string | null {
    if (value == null) return null;
    const normalized = value.trim();
    return normalized || null;
  }
}
