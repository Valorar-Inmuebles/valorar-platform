import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationChannel,
  Prisma,
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
import { hasMinimumCalendarMonth } from '../utils/rental-contract-term';

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

  async findAll(
    tenantId: string,
    status?: RentalContractStatus,
    search?: string,
  ) {
    return (
      await this.repository.findMany(
        tenantId,
        status,
        search?.trim() || undefined,
      )
    ).map((contract) => RentalContractResponseDto.fromEntity(contract));
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
    const startsOn = dto.startsOn
      ? this.parseDate(dto.startsOn, 'startsOn')
      : existing.startsOn;
    const endsOn =
      dto.endsOn !== undefined
        ? this.parseOptionalDate(dto.endsOn, 'endsOn')
        : existing.endsOn;
    this.assertDateRange(startsOn, endsOn);
    if (existing.status === RentalContractStatus.ACTIVE) {
      const parties = dto.parties ?? existing.parties;
      this.assertActiveTerm(startsOn, endsOn);
      this.assertActiveParties(parties);
    }
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

  async renew(id: string, tenantId: string, createdById: string | null) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await this.repository.renew(id, tenantId, createdById);
        if (result.outcome === 'NOT_FOUND')
          throw new NotFoundException(
            `Rental contract with id "${id}" not found`,
          );
        if (result.outcome === 'INVALID_STATUS')
          throw new ConflictException(
            `Rental contract cannot be renewed from ${result.status}`,
          );
        if (result.outcome === 'ALREADY_RENEWED')
          throw new ConflictException(
            `Rental contract already renewed as ${result.contract.internalNumber}`,
          );
        return RentalContractResponseDto.fromEntity(result.contract);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt === 0
        ) {
          continue;
        }
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2002' || error.code === 'P2034')
        ) {
          const existing = await this.repository.findRenewalByPrevious(
            id,
            tenantId,
          );
          if (existing)
            throw new ConflictException(
              `Rental contract already renewed as ${existing.internalNumber}`,
            );
        }
        throw error;
      }
    }
    throw new ConflictException('Rental contract renewal conflicted');
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
      this.assertActiveTerm(existing.startsOn, existing.endsOn);
      this.assertActiveParties(existing.parties);
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
    let primaryRenters = 0;
    for (const party of parties) {
      const key = `${party.role}:${party.contactId}`;
      if (partyKeys.has(key))
        throw new BadRequestException(
          'A contact cannot repeat in the same contract role',
        );
      partyKeys.add(key);
      if (party.isPrimary) {
        if (party.role !== RentalContractPartyRole.RENTER)
          throw new BadRequestException(
            'Only a renter can be the primary contract party',
          );
        primaryRenters += 1;
      }
      const channels = new Set<NotificationChannel>();
      for (const route of party.notificationRoutes ?? []) {
        if (channels.has(route.channel))
          throw new BadRequestException(
            'Only one contact point per channel is allowed',
          );
        channels.add(route.channel);
      }
    }
    if (primaryRenters > 1)
      throw new BadRequestException(
        'Only one primary renter is allowed per rental contract',
      );
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
    if (endsOn && endsOn <= startsOn)
      throw new BadRequestException('endsOn must be after startsOn');
  }
  private assertActiveTerm(startsOn: Date, endsOn: Date | null) {
    if (!endsOn)
      throw new BadRequestException(
        'endsOn is required to activate a rental contract',
      );
    this.assertDateRange(startsOn, endsOn);
    if (!hasMinimumCalendarMonth(startsOn, endsOn))
      throw new BadRequestException(
        'A rental contract must last at least one calendar month',
      );
  }
  private assertActiveParties(
    parties: Array<{
      role: RentalContractPartyRole;
      isPrimary?: boolean;
      contact?: { isActive: boolean };
    }>,
  ) {
    const renters = parties.filter(
      (party) =>
        party.role === RentalContractPartyRole.RENTER &&
        (party.contact?.isActive ?? true),
    );
    if (renters.length === 0)
      throw new BadRequestException(
        'At least one active renter is required to activate a rental contract',
      );
    if (renters.filter((party) => party.isPrimary).length !== 1)
      throw new BadRequestException(
        'Exactly one primary renter is required to activate a rental contract',
      );
  }
  private normalizeOptionalText(
    value: string | null | undefined,
  ): string | null {
    if (value == null) return null;
    const normalized = value.trim();
    return normalized || null;
  }
}
