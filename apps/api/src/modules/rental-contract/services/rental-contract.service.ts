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
import {
  ListRentalContractsQueryDto,
  RentalContractHistoryQueryDto,
} from '../dto/rental-contract-query.dto';
import { RentalContractResponseDto } from '../dto/rental-contract-response.dto';
import { UpdateRentalContractDto } from '../dto/update-rental-contract.dto';
import { RentalContractRepository } from '../repositories/rental-contract.repository';
import { localDateForTimeZone } from '../../rental-obligation/utils/rental-occurrence-materializer';
import { hasMinimumCalendarMonth } from '../utils/rental-contract-term';
import {
  effectiveRevisionFor,
  nextAdjustmentDate,
} from '../../rental-obligation/utils/rent-value-revision';
import { formatDateOnly } from '../../rental-obligation/utils/rental-occurrence-materializer';

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

  async findAll(tenantId: string, query: ListRentalContractsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    if (query.endingBefore && query.endingWithinDays) {
      throw new BadRequestException(
        'endingBefore and endingWithinDays cannot be combined',
      );
    }
    let endingFrom: Date | undefined;
    let endingBefore = query.endingBefore
      ? this.parseDate(query.endingBefore, 'endingBefore')
      : undefined;
    if (query.endingWithinDays) {
      endingFrom = localDateForTimeZone(
        new Date(),
        await this.repository.tenantTimeZone(tenantId),
      );
      endingBefore = new Date(endingFrom);
      endingBefore.setUTCDate(
        endingBefore.getUTCDate() + query.endingWithinDays,
      );
    }
    const [items, total] = await this.repository.findMany(tenantId, {
      status:
        query.endingWithinDays && !query.status
          ? RentalContractStatus.ACTIVE
          : query.status,
      search: query.search?.trim() || undefined,
      endingFrom,
      endingBefore,
      countryId: query.countryId,
      provinceId: query.provinceId,
      localityId: query.localityId,
      neighborhoodId: query.neighborhoodId,
      partyContactId: query.partyContactId,
      partyRole: query.partyRole,
      sortBy: query.sortBy ?? 'startsOn',
      sortOrder: query.sortOrder ?? 'desc',
      page,
      pageSize,
    });
    return {
      items: items.map((item) => {
        const { obligations, ...contract } = item;
        const nextDueOccurrence =
          obligations
            .flatMap((obligation) =>
              obligation.occurrences.map((occurrence) => ({
                ...occurrence,
                amount:
                  occurrence.amount == null ? null : Number(occurrence.amount),
                dueDatePending: occurrence.dueDate == null,
                concept: obligation.concept,
              })),
            )
            .sort((a, b) => {
              if (a.dueDate == null) return b.dueDate == null ? 0 : 1;
              if (b.dueDate == null) return -1;
              return a.dueDate.getTime() - b.dueDate.getTime();
            })[0] ?? null;
        return { ...contract, nextDueOccurrence };
      }),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string, tenantId: string) {
    return RentalContractResponseDto.fromEntity(
      await this.requireContract(id, tenantId),
    );
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateRentalContractDto,
    actorId: string | null = null,
  ) {
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
      actorId,
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

  activate(id: string, tenantId: string, actorId: string | null = null) {
    return this.transition(id, tenantId, RentalContractStatus.ACTIVE, actorId);
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
        ? await this.repository.activateWithRentRequirement(
            id,
            tenantId,
            actorId,
          )
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

  async history(
    id: string,
    tenantId: string,
    query: RentalContractHistoryQueryDto,
  ) {
    await this.requireContract(id, tenantId);
    const from = query.from ? this.parseDate(query.from, 'from') : undefined;
    const to = query.to
      ? new Date(this.parseDate(query.to, 'to').getTime() + 86_400_000 - 1)
      : undefined;
    if (from && to && from > to) {
      throw new BadRequestException('from must be before or equal to to');
    }
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const includeContracts = query.category !== 'FULFILLMENT';
    const includeFulfillments = query.category !== 'CONTRACT' && !query.type;
    const contractPromise: Promise<
      Awaited<ReturnType<RentalContractRepository['findContractEvents']>>
    > = includeContracts
      ? this.repository.findContractEvents(tenantId, id, {
          type: query.type,
          from,
          to,
          skip: 0,
          take: page * pageSize,
        })
      : Promise.resolve([[], 0]);
    const fulfillmentPromise: Promise<
      Awaited<ReturnType<RentalContractRepository['findFulfillmentHistory']>>
    > = includeFulfillments
      ? this.repository.findFulfillmentHistory(tenantId, id, {
          from,
          to,
          take: page * pageSize,
        })
      : Promise.resolve([[], 0, [], 0]);
    const [contractResult, fulfillmentResult] = await Promise.all([
      contractPromise,
      fulfillmentPromise,
    ]);
    const [events, eventTotal] = contractResult;
    const [fulfillments, fulfillmentTotal, reversals, reversalTotal] =
      fulfillmentResult;
    const contractItems = events.map((event) => ({
      id: event.id,
      category: 'CONTRACT' as const,
      type: event.type,
      occurredAt: event.occurredAt,
      actor: event.actor,
      metadata: event.metadata,
    }));
    const fulfillmentItems = fulfillments.map((fulfillment) => {
      const context = {
        fulfillmentId: fulfillment.id,
        occurrenceId: fulfillment.occurrence.id,
        periodKey: fulfillment.occurrence.periodKey,
        dueDate: fulfillment.occurrence.dueDate,
        concept: fulfillment.occurrence.obligation.concept,
        amount: fulfillment.amount == null ? null : Number(fulfillment.amount),
        notes: fulfillment.notes,
      };
      return {
        id: `fulfillment:${fulfillment.id}:recorded`,
        category: 'FULFILLMENT' as const,
        type: 'FULFILLMENT_RECORDED',
        occurredAt: fulfillment.createdAt,
        actor: fulfillment.recordedBy,
        metadata: context,
      };
    });
    const reversalItems = reversals.map((fulfillment) => ({
      id: `fulfillment:${fulfillment.id}:reversed`,
      category: 'FULFILLMENT' as const,
      type: 'FULFILLMENT_REVERSED',
      occurredAt: fulfillment.reversedAt!,
      actor: fulfillment.reversedBy,
      metadata: {
        fulfillmentId: fulfillment.id,
        occurrenceId: fulfillment.occurrence.id,
        periodKey: fulfillment.occurrence.periodKey,
        dueDate: fulfillment.occurrence.dueDate,
        concept: fulfillment.occurrence.obligation.concept,
        amount: fulfillment.amount == null ? null : Number(fulfillment.amount),
        notes: fulfillment.notes,
        reversalReason: fulfillment.reversalReason,
      },
    }));
    const merged = [
      ...contractItems,
      ...fulfillmentItems,
      ...reversalItems,
    ].sort(
      (a, b) =>
        b.occurredAt.getTime() - a.occurredAt.getTime() ||
        b.id.localeCompare(a.id),
    );
    const total = eventTotal + fulfillmentTotal + reversalTotal;
    const start = (page - 1) * pageSize;
    return {
      items: merged.slice(start, start + pageSize),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async general(id: string, tenantId: string) {
    const [contract, timeZone] = await Promise.all([
      this.repository.findGeneralById(id, tenantId),
      this.repository.tenantTimeZone(tenantId),
    ]);
    if (!contract) {
      throw new NotFoundException(`Rental contract with id "${id}" not found`);
    }
    const localToday = localDateForTimeZone(new Date(), timeZone);
    const rent = contract.obligations.find(
      (item) => item.isActive && item.concept.systemCode === 'RENT',
    );
    const currentRentRevision = rent
      ? effectiveRevisionFor(rent.rentValueRevisions, localToday)
      : null;
    const nextAdjustment = rent
      ? nextAdjustmentDate(
          [...rent.rentValueRevisions].reverse(),
          rent.adjustmentIntervalMonths,
        )
      : null;
    const pendingOccurrences = contract.obligations
      .flatMap((obligation) =>
        obligation.occurrences.map((occurrence) => ({
          id: occurrence.id,
          periodKey: occurrence.periodKey,
          dueDate: occurrence.dueDate,
          dueDatePending: occurrence.dueDate == null,
          amount: occurrence.amount == null ? null : Number(occurrence.amount),
          currency: occurrence.currency,
          operationalStatus:
            occurrence.dueDate != null && occurrence.dueDate < localToday
              ? 'OVERDUE'
              : occurrence.status,
          fulfillmentSummary: occurrence.fulfillments[0]
            ? {
                id: occurrence.fulfillments[0].id,
                status: occurrence.fulfillments[0].status,
                fulfilledOn: occurrence.fulfillments[0].fulfilledOn,
                amount:
                  occurrence.fulfillments[0].amount == null
                    ? null
                    : Number(occurrence.fulfillments[0].amount),
                actorId: occurrence.fulfillments[0].recordedById,
                notes: occurrence.fulfillments[0].notes,
              }
            : null,
          concept: {
            id: obligation.concept.id,
            name: obligation.concept.name,
            systemCode: obligation.concept.systemCode,
          },
        })),
      )
      .sort((a, b) => {
        if (a.dueDate == null) return b.dueDate == null ? 0 : 1;
        if (b.dueDate == null) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
    return {
      ...RentalContractResponseDto.fromEntity(contract),
      currentRent: rent
        ? {
            obligationId: rent.id,
            amount:
              currentRentRevision?.amount == null
                ? rent.defaultAmount == null
                  ? null
                  : Number(rent.defaultAmount)
                : Number(currentRentRevision.amount),
            currency: rent.currency,
            adjustmentIntervalMonths: rent.adjustmentIntervalMonths,
            adjustmentConfigurationPending:
              rent.adjustmentIntervalMonths == null,
            nextAdjustmentDate: nextAdjustment
              ? formatDateOnly(nextAdjustment)
              : null,
          }
        : null,
      obligations: contract.obligations.map((obligation) => ({
        id: obligation.id,
        concept: obligation.concept,
        kind: obligation.kind,
        dueMode: obligation.dueMode,
        dueDay: obligation.dueDay,
        includeInNotice: obligation.includeInNotice,
        showAmount: obligation.showAmount,
        isActive: obligation.isActive,
      })),
      nextDueOccurrence: pendingOccurrences[0] ?? null,
      upcomingOccurrences: pendingOccurrences.slice(0, 5),
      communicationActivity: null,
    };
  }

  async dashboard(tenantId: string) {
    const timeZone = await this.repository.tenantTimeZone(tenantId);
    const today = localDateForTimeZone(new Date(), timeZone);
    const attentionUntil = new Date(today);
    attentionUntil.setUTCDate(attentionUntil.getUTCDate() + 60);
    const [byStatus, endingSoon, pending, overdue, fulfilled, activity] =
      await this.repository.dashboard(tenantId, today, attentionUntil);
    return {
      contracts: Object.fromEntries(
        Object.values(RentalContractStatus).map((status) => [
          status,
          (() => {
            const count = byStatus.find(
              (item) => item.status === status,
            )?._count;
            return typeof count === 'object' ? (count._all ?? 0) : 0;
          })(),
        ]),
      ),
      attention: {
        endingSoon,
        pendingOccurrences: pending,
        overdueOccurrences: overdue,
        fulfilledOccurrences: fulfilled,
      },
      activity,
      communications: { available: false, sent: null },
    };
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
