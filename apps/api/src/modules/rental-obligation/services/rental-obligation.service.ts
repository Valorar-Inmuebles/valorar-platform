import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  RentalAmountMode,
  RentalContractStatus,
  RentalDueMode,
  RentalObligationKind,
  RentalOccurrenceStatus,
} from '../../../../generated/prisma/client';
import { CreateRentalObligationDto } from '../dto/create-rental-obligation.dto';
import { CreateRentValueRevisionDto } from '../dto/create-rent-value-revision.dto';
import { ListRentalOccurrencesQueryDto } from '../dto/rental-occurrence.dto';
import { UpdateRentalObligationDto } from '../dto/update-rental-obligation.dto';
import {
  RentalFulfillmentConflictError,
  RentalObligationRecord,
  RentalObligationRepository,
  RentalOccurrenceRecord,
} from '../repositories/rental-obligation.repository';
import {
  buildOccurrenceSeeds,
  formatDateOnly,
  localDateForTimeZone,
  parseDateOnly,
} from '../utils/rental-occurrence-materializer';
import {
  effectiveRevisionFor,
  nextAdjustmentDate,
} from '../utils/rent-value-revision';

@Injectable()
export class RentalObligationService {
  constructor(private readonly repository: RentalObligationRepository) {}

  async listObligations(contractId: string, tenantId: string) {
    if (!(await this.repository.findContract(contractId, tenantId))) {
      throw new NotFoundException('Rental contract not found');
    }
    return (await this.repository.findMany(contractId, tenantId)).map((item) =>
      this.toObligationResponse(item),
    );
  }

  async create(tenantId: string, dto: CreateRentalObligationDto) {
    const [contract, concept] = await Promise.all([
      this.repository.findContract(dto.contractId, tenantId),
      this.repository.findConcept(dto.conceptId, tenantId),
    ]);
    if (!contract) throw new BadRequestException('Invalid tenant contract');
    if (!concept?.isActive) {
      throw new BadRequestException(
        'conceptId must reference an active concept in the same tenant',
      );
    }
    if (this.isTerminal(contract.status)) {
      throw new ConflictException(
        'Terminal rental contracts cannot change obligations',
      );
    }

    const isRent = concept.systemCode === 'RENT';
    const normalized = this.validateConfiguration(dto, contract, true, isRent);
    if (
      isRent &&
      (dto.isActive ?? true) &&
      (await this.repository.countActiveRent(dto.contractId, tenantId)) > 0
    ) {
      throw new ConflictException(
        'The contract already has an active RENT obligation',
      );
    }

    const includeInNotice = dto.includeInNotice ?? isRent;
    const showAmount = includeInNotice && (dto.showAmount ?? isRent);
    const obligation = await this.repository.create(
      {
        tenantId,
        contractId: dto.contractId,
        conceptId: dto.conceptId,
        kind: dto.kind,
        recurrenceMonths: normalized.recurrenceMonths,
        dueMode: normalized.dueMode,
        dueDay: normalized.dueDay,
        amountMode: dto.amountMode,
        defaultAmount: dto.defaultAmount ?? null,
        currency: dto.currency,
        adjustmentIntervalMonths: dto.adjustmentIntervalMonths ?? null,
        includeInNotice,
        showAmount,
        startsOn: normalized.startsOn,
        endsOn: normalized.endsOn,
        isActive: dto.isActive ?? true,
      },
      isRent && dto.defaultAmount
        ? {
            effectiveFrom: normalized.startsOn,
            amount: dto.defaultAmount,
            currency: dto.currency,
          }
        : undefined,
    );
    await this.materializeRecord(
      obligation,
      tenantId,
      normalized.oneTimeDueDate,
    );
    return this.toObligationResponse(obligation);
  }

  async update(id: string, tenantId: string, dto: UpdateRentalObligationDto) {
    const existing = await this.requireObligation(id, tenantId);
    if (this.isTerminal(existing.contract.status)) {
      throw new ConflictException(
        'Terminal rental contracts cannot change obligations',
      );
    }
    if (dto.kind && dto.kind !== existing.kind) {
      throw new BadRequestException(
        'kind cannot change after obligation creation',
      );
    }

    const conceptId = dto.conceptId ?? existing.conceptId;
    const concept = await this.repository.findConcept(conceptId, tenantId);
    if (
      !concept ||
      (!concept.isActive && (dto.isActive ?? existing.isActive))
    ) {
      throw new BadRequestException(
        'conceptId must reference an active concept in the same tenant',
      );
    }
    const effective = {
      ...dto,
      contractId: existing.contractId,
      conceptId,
      kind: existing.kind,
      recurrenceMonths:
        dto.recurrenceMonths !== undefined
          ? dto.recurrenceMonths
          : existing.recurrenceMonths,
      dueMode: dto.dueMode ?? existing.dueMode,
      dueDay: dto.dueDay !== undefined ? dto.dueDay : existing.dueDay,
      amountMode: dto.amountMode ?? existing.amountMode,
      defaultAmount:
        dto.defaultAmount !== undefined
          ? dto.defaultAmount
          : existing.defaultAmount
            ? Number(existing.defaultAmount)
            : null,
      currency: dto.currency ?? existing.currency,
      adjustmentIntervalMonths:
        dto.adjustmentIntervalMonths !== undefined
          ? dto.adjustmentIntervalMonths
          : existing.adjustmentIntervalMonths,
      includeInNotice: dto.includeInNotice ?? existing.includeInNotice,
      showAmount:
        dto.includeInNotice === false
          ? false
          : (dto.showAmount ?? existing.showAmount),
      startsOn: dto.startsOn ?? formatDateOnly(existing.startsOn),
      endsOn:
        dto.endsOn !== undefined
          ? dto.endsOn
          : existing.endsOn
            ? formatDateOnly(existing.endsOn)
            : null,
      isActive: dto.isActive ?? existing.isActive,
    } satisfies CreateRentalObligationDto;
    const wasRent = existing.concept.systemCode === 'RENT';
    const isRent = concept.systemCode === 'RENT';
    if (wasRent !== isRent) {
      throw new BadRequestException(
        'RENT obligations cannot change to or from another concept',
      );
    }
    if (
      wasRent &&
      dto.startsOn !== undefined &&
      this.parseDate(dto.startsOn, 'startsOn').getTime() !==
        existing.startsOn.getTime() &&
      existing.rentValueRevisions.length > 0
    ) {
      throw new BadRequestException(
        'RENT startsOn cannot change after its initial value revision',
      );
    }
    const normalized = this.validateConfiguration(
      effective,
      existing.contract,
      false,
      isRent,
      wasRent &&
        existing.contract.status === RentalContractStatus.ACTIVE &&
        existing.adjustmentIntervalMonths == null &&
        effective.adjustmentIntervalMonths == null,
    );

    const remainsActiveRent = isRent && effective.isActive;
    if (
      wasRent &&
      dto.currency !== undefined &&
      dto.currency !== existing.currency &&
      existing.rentValueRevisions.length > 0
    ) {
      throw new BadRequestException(
        'RENT currency cannot change after its initial value revision',
      );
    }
    if (
      wasRent &&
      dto.defaultAmount !== undefined &&
      existing.rentValueRevisions.length > 0 &&
      Number(existing.defaultAmount) !== dto.defaultAmount
    ) {
      throw new BadRequestException(
        'Use the rent-adjustments operation to change RENT amount',
      );
    }
    if (
      remainsActiveRent &&
      (await this.repository.countActiveRent(
        existing.contractId,
        tenantId,
        id,
      )) > 0
    ) {
      throw new ConflictException(
        'The contract already has an active RENT obligation',
      );
    }
    if (
      existing.contract.status === RentalContractStatus.ACTIVE &&
      wasRent &&
      !remainsActiveRent &&
      (await this.repository.countActiveRent(
        existing.contractId,
        tenantId,
        id,
      )) === 0
    ) {
      throw new ConflictException(
        'An active contract must keep an active RENT obligation',
      );
    }

    const updateData: Prisma.RentalObligationUncheckedUpdateInput = {
      ...(dto.conceptId !== undefined ? { conceptId } : {}),
      ...(dto.recurrenceMonths !== undefined
        ? { recurrenceMonths: normalized.recurrenceMonths }
        : {}),
      ...(dto.dueMode !== undefined ? { dueMode: normalized.dueMode } : {}),
      ...(dto.dueDay !== undefined ? { dueDay: normalized.dueDay } : {}),
      ...(dto.amountMode !== undefined ? { amountMode: dto.amountMode } : {}),
      ...(dto.defaultAmount !== undefined
        ? { defaultAmount: dto.defaultAmount }
        : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.adjustmentIntervalMonths !== undefined
        ? { adjustmentIntervalMonths: dto.adjustmentIntervalMonths }
        : {}),
      ...(dto.includeInNotice !== undefined
        ? { includeInNotice: dto.includeInNotice }
        : {}),
      ...(dto.showAmount !== undefined || dto.includeInNotice === false
        ? { showAmount: effective.showAmount }
        : {}),
      ...(dto.startsOn !== undefined ? { startsOn: normalized.startsOn } : {}),
      ...(dto.endsOn !== undefined ? { endsOn: normalized.endsOn } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
    const shouldCreateInitialRevision =
      isRent &&
      existing.rentValueRevisions.length === 0 &&
      effective.defaultAmount != null &&
      effective.defaultAmount > 0;
    const updated = shouldCreateInitialRevision
      ? await this.repository.updateWithInitialRevision(
          id,
          tenantId,
          updateData,
          {
            effectiveFrom: normalized.startsOn,
            amount: effective.defaultAmount!,
            currency: effective.currency,
          },
        )
      : await this.repository.update(id, tenantId, updateData);
    if (!updated) throw new NotFoundException('Rental obligation not found');
    if (updated.isActive) await this.materializeRecord(updated, tenantId);
    return this.toObligationResponse(updated);
  }

  async createRentAdjustment(
    id: string,
    tenantId: string,
    actorId: string | null,
    dto: CreateRentValueRevisionDto,
  ) {
    const obligation = await this.requireObligation(id, tenantId);
    if (obligation.concept.systemCode !== 'RENT') {
      throw new BadRequestException(
        'Rent adjustments are only available for the RENT obligation',
      );
    }
    if (this.isTerminal(obligation.contract.status)) {
      throw new ConflictException(
        'Terminal rental contracts cannot register rent adjustments',
      );
    }
    if (dto.currency !== obligation.currency) {
      throw new BadRequestException(
        'A rent adjustment cannot change the obligation currency',
      );
    }
    const effectiveFrom = this.parseDate(dto.effectiveFrom, 'effectiveFrom');
    if (
      effectiveFrom < obligation.startsOn ||
      (obligation.endsOn && effectiveFrom > obligation.endsOn) ||
      effectiveFrom < obligation.contract.startsOn ||
      (obligation.contract.endsOn && effectiveFrom > obligation.contract.endsOn)
    ) {
      throw new BadRequestException(
        'effectiveFrom must be inside the obligation and contract dates',
      );
    }
    if (
      obligation.rentValueRevisions.length === 0 &&
      effectiveFrom.getTime() !== obligation.startsOn.getTime()
    ) {
      throw new BadRequestException(
        'The initial rent revision must start with the obligation',
      );
    }
    try {
      const revision = await this.repository.createRentValueRevision(
        id,
        tenantId,
        {
          effectiveFrom,
          amount: dto.amount,
          currency: dto.currency,
          recordedById: actorId,
          reason: this.normalizeText(dto.reason),
        },
      );
      return {
        ...revision,
        amount: Number(revision.amount),
        obligation: this.toObligationResponse(
          await this.requireObligation(id, tenantId),
        ),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A rent value revision already exists for effectiveFrom',
        );
      }
      throw error;
    }
  }

  async updateDueDate(id: string, tenantId: string, value: string) {
    const occurrence = await this.repository.findOccurrence(id, tenantId);
    if (!occurrence) throw new NotFoundException('Rental occurrence not found');
    if (occurrence.status !== RentalOccurrenceStatus.PENDING) {
      throw new ConflictException('Only a pending occurrence can set dueDate');
    }
    if (
      occurrence.obligation.dueMode !== RentalDueMode.MANUAL_PER_PERIOD ||
      occurrence.obligation.kind !== RentalObligationKind.RECURRING
    ) {
      throw new BadRequestException(
        'dueDate can only be assigned for MANUAL_PER_PERIOD obligations',
      );
    }
    const dueDate = this.parseDate(value, 'dueDate');
    const startsOn =
      occurrence.periodStartsOn ?? occurrence.obligation.startsOn;
    const endsOn =
      occurrence.periodEndsOn ??
      occurrence.obligation.endsOn ??
      occurrence.obligation.contract.endsOn;
    if (
      dueDate < startsOn ||
      (endsOn && dueDate > endsOn) ||
      dueDate < occurrence.obligation.contract.startsOn
    ) {
      throw new BadRequestException(
        'dueDate must be inside the occurrence and contract validity',
      );
    }
    const updated = await this.repository.updatePendingOccurrence(
      id,
      tenantId,
      { dueDate },
    );
    if (!updated)
      throw new ConflictException('Only a pending occurrence can be edited');
    return this.occurrenceResponseForTenant(updated, tenantId);
  }

  async materialize(id: string, tenantId: string) {
    const obligation = await this.requireObligation(id, tenantId);
    if (!obligation.isActive) {
      throw new ConflictException(
        'Inactive obligations cannot materialize occurrences',
      );
    }
    return Promise.all(
      (await this.materializeRecord(obligation, tenantId)).map((item) =>
        this.occurrenceResponseForTenant(item, tenantId),
      ),
    );
  }

  async listOccurrences(
    tenantId: string,
    query: ListRentalOccurrencesQueryDto,
    upcomingOnly = false,
  ) {
    const timeZone = await this.repository.tenantTimeZone(tenantId);
    const today = localDateForTimeZone(new Date(), timeZone);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.RentalObligationOccurrenceWhereInput = {};
    const obligationWhere: Prisma.RentalObligationWhereInput = {};
    const dueDateFilter: Prisma.DateTimeFilter = {};
    if (query.contractId) obligationWhere.contractId = query.contractId;
    if (query.status === 'OVERDUE') {
      where.status = RentalOccurrenceStatus.PENDING;
      dueDateFilter.lt = today;
    } else if (query.status === 'PENDING') {
      where.status = RentalOccurrenceStatus.PENDING;
    } else if (query.status) {
      where.status = query.status;
    }
    const requestedRange: Prisma.DateTimeFilter = {
      ...(query.dueFrom
        ? { gte: this.parseDate(query.dueFrom, 'dueFrom') }
        : {}),
      ...(query.dueTo ? { lte: this.parseDate(query.dueTo, 'dueTo') } : {}),
    };
    Object.assign(dueDateFilter, requestedRange);
    if (query.month) {
      const monthStart = this.parseDate(`${query.month}-01`, 'month');
      const nextMonth = new Date(monthStart);
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
      dueDateFilter.gte = monthStart;
      dueDateFilter.lt = nextMonth;
    }
    if (query.category === 'OVERDUE') {
      where.status = RentalOccurrenceStatus.PENDING;
      dueDateFilter.lt = today;
    } else if (query.category === 'RENT') {
      obligationWhere.concept = { systemCode: 'RENT' };
    } else if (query.category === 'OTHER') {
      obligationWhere.concept = { systemCode: { not: 'RENT' } };
    }
    if (query.conceptId) {
      obligationWhere.conceptId = query.conceptId;
    }
    if (Object.keys(obligationWhere).length > 0) {
      where.obligation = obligationWhere;
    }
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.AND = [
        ...(Array.isArray(where.AND)
          ? where.AND
          : where.AND
            ? [where.AND]
            : []),
        {
          OR: [
            {
              obligation: {
                contract: {
                  internalNumber: { contains: search, mode: 'insensitive' },
                },
              },
            },
            {
              obligation: {
                contract: {
                  propertyAddressSnapshot: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              },
            },
            {
              obligation: {
                contract: {
                  parties: {
                    some: {
                      role: 'RENTER',
                      contact: {
                        name: { contains: search, mode: 'insensitive' },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      ];
    }
    if (upcomingOnly) {
      where.status = RentalOccurrenceStatus.PENDING;
      dueDateFilter.gte = today;
    }
    if (Object.keys(dueDateFilter).length) where.dueDate = dueDateFilter;
    if (upcomingOnly) {
      return (await this.repository.findOccurrences(tenantId, where, 20)).map(
        (item) => this.toOccurrenceResponse(item, today),
      );
    }
    const orderBy = this.occurrenceOrderBy(
      query.sortBy ?? 'dueDate',
      query.sortOrder ?? 'asc',
    );
    const [items, total] = await this.repository.findOperationalOccurrences(
      tenantId,
      where,
      orderBy,
      page,
      pageSize,
    );
    return {
      items: items.map((item) => this.toOccurrenceResponse(item, today)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async nextOccurrence(tenantId: string, contractId?: string) {
    const item = await this.repository.findNextAttentionOccurrence(
      tenantId,
      contractId,
    );
    return item ? this.occurrenceResponseForTenant(item, tenantId) : null;
  }

  private occurrenceOrderBy(
    sortBy: NonNullable<ListRentalOccurrencesQueryDto['sortBy']>,
    sortOrder: 'asc' | 'desc',
  ): Prisma.RentalObligationOccurrenceOrderByWithRelationInput[] {
    const primary: Prisma.RentalObligationOccurrenceOrderByWithRelationInput =
      sortBy === 'internalNumber'
        ? { obligation: { contract: { internalNumber: sortOrder } } }
        : sortBy === 'concept'
          ? { obligation: { concept: { name: sortOrder } } }
          : sortBy === 'dueDate'
            ? { dueDate: { sort: sortOrder, nulls: 'last' } }
            : { [sortBy]: sortOrder };
    return [primary, { id: 'asc' }];
  }

  async updateAmount(
    id: string,
    tenantId: string,
    amount: number | null | undefined,
  ) {
    if (amount === undefined)
      throw new BadRequestException('amount is required');
    if (amount === null) {
      const occurrence = await this.repository.findOccurrence(id, tenantId);
      if (!occurrence)
        throw new NotFoundException('Rental occurrence not found');
      if (occurrence.obligation.amountMode === RentalAmountMode.FIXED) {
        throw new BadRequestException(
          'A fixed obligation occurrence must keep an amount',
        );
      }
    }
    const updated = await this.repository.updatePendingOccurrence(
      id,
      tenantId,
      { amount },
    );
    if (!updated)
      throw new ConflictException('Only a pending occurrence can be edited');
    return this.occurrenceResponseForTenant(updated, tenantId);
  }

  async cancelOccurrence(
    id: string,
    tenantId: string,
    actorId: string | null,
    reason: string,
  ) {
    const normalizedReason = reason.trim();
    if (!normalizedReason) throw new BadRequestException('reason is required');
    const updated = await this.repository.updatePendingOccurrence(
      id,
      tenantId,
      {
        status: RentalOccurrenceStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledById: actorId,
        cancellationReason: normalizedReason,
      },
    );
    if (!updated)
      throw new ConflictException('Only a pending occurrence can be cancelled');
    return this.occurrenceResponseForTenant(updated, tenantId);
  }

  async recordFulfillment(
    id: string,
    tenantId: string,
    actorId: string | null,
    dto: { fulfilledOn: string; amount?: number | null; notes?: string | null },
  ) {
    const occurrence = await this.repository.findOccurrence(id, tenantId);
    if (!occurrence) throw new NotFoundException('Rental occurrence not found');
    try {
      const result = await this.repository.recordFulfillment(occurrence, {
        fulfilledOn: this.parseDate(dto.fulfilledOn, 'fulfilledOn'),
        amount: dto.amount !== undefined ? dto.amount : occurrence.amount,
        notes: this.normalizeText(dto.notes),
        recordedById: actorId,
      });
      return {
        fulfillment: this.toFulfillmentResponse(result.fulfillment),
        occurrence: await this.occurrenceResponseForTenant(
          result.occurrence,
          tenantId,
        ),
      };
    } catch (error) {
      if (error instanceof RentalFulfillmentConflictError) {
        throw new ConflictException(
          'Occurrence already fulfilled or no longer pending',
        );
      }
      throw error;
    }
  }

  async reverseFulfillment(
    id: string,
    tenantId: string,
    actorId: string | null,
    reason: string,
  ) {
    const fulfillment = await this.repository.findFulfillment(id, tenantId);
    if (!fulfillment)
      throw new NotFoundException('Rental fulfillment not found');
    const normalizedReason = reason.trim();
    if (!normalizedReason) throw new BadRequestException('reason is required');
    try {
      const occurrence = await this.repository.reverseFulfillment(
        id,
        tenantId,
        fulfillment.occurrenceId,
        actorId,
        normalizedReason,
      );
      return this.occurrenceResponseForTenant(occurrence, tenantId);
    } catch (error) {
      if (error instanceof RentalFulfillmentConflictError) {
        throw new ConflictException('Fulfillment is not currently reversible');
      }
      throw error;
    }
  }

  private async materializeRecord(
    obligation: RentalObligationRecord,
    tenantId: string,
    oneTimeDueDate?: Date | null,
  ) {
    const timeZone = await this.repository.tenantTimeZone(tenantId);
    const seeds = buildOccurrenceSeeds({
      kind: obligation.kind,
      recurrenceMonths: obligation.recurrenceMonths,
      dueMode: obligation.dueMode,
      dueDay: obligation.dueDay,
      oneTimeDueDate,
      obligationStartsOn: obligation.startsOn,
      obligationEndsOn: obligation.endsOn,
      contractStartsOn: obligation.contract.startsOn,
      contractEndsOn: obligation.contract.endsOn,
      localToday: localDateForTimeZone(new Date(), timeZone),
    }).map((seed) => ({
      ...seed,
      amount:
        obligation.concept.systemCode === 'RENT'
          ? (effectiveRevisionFor(
              obligation.rentValueRevisions,
              seed.periodStartsOn ?? seed.dueDate ?? obligation.startsOn,
            )?.amount ?? obligation.defaultAmount)
          : obligation.defaultAmount,
      currency: obligation.currency,
      status: RentalOccurrenceStatus.PENDING,
    }));
    return this.repository.createMissingOccurrences(
      obligation.id,
      tenantId,
      seeds,
    );
  }

  private validateConfiguration(
    dto: CreateRentalObligationDto,
    contract: {
      startsOn: Date;
      endsOn: Date | null;
      status: RentalContractStatus;
    },
    requireOneTimeDate = true,
    isRent = false,
    allowLegacyActiveAdjustmentPending = false,
  ) {
    const startsOn = this.parseDate(dto.startsOn, 'startsOn');
    const endsOn = dto.endsOn ? this.parseDate(dto.endsOn, 'endsOn') : null;
    if (endsOn && endsOn < startsOn)
      throw new BadRequestException('Invalid obligation date range');
    if (
      startsOn < contract.startsOn ||
      (contract.endsOn && endsOn && endsOn > contract.endsOn)
    ) {
      throw new BadRequestException(
        'Obligation dates must be inside contract dates',
      );
    }
    if (
      dto.amountMode === RentalAmountMode.FIXED &&
      !(dto.defaultAmount && dto.defaultAmount > 0)
    ) {
      throw new BadRequestException(
        'FIXED obligations require defaultAmount greater than zero',
      );
    }
    if (dto.showAmount && dto.includeInNotice !== true) {
      throw new BadRequestException(
        'showAmount requires includeInNotice to be enabled',
      );
    }
    const dueMode = dto.dueMode ?? RentalDueMode.FIXED_DAY;
    if (isRent && dto.kind !== RentalObligationKind.RECURRING) {
      throw new BadRequestException('RENT must be a recurring obligation');
    }
    if (!isRent && dto.adjustmentIntervalMonths != null) {
      throw new BadRequestException(
        'adjustmentIntervalMonths is only available for RENT',
      );
    }
    if (dto.kind === RentalObligationKind.RECURRING) {
      if (
        !dto.recurrenceMonths ||
        dto.recurrenceMonths < 1 ||
        dto.recurrenceMonths > 12
      ) {
        throw new BadRequestException(
          'RECURRING requires recurrenceMonths between 1 and 12',
        );
      }
      if (
        dueMode === RentalDueMode.FIXED_DAY &&
        (!dto.dueDay || dto.dueDay < 1 || dto.dueDay > 31)
      ) {
        throw new BadRequestException('FIXED_DAY requires dueDay 1-31');
      }
      if (dueMode === RentalDueMode.MANUAL_PER_PERIOD && dto.dueDay != null) {
        throw new BadRequestException(
          'MANUAL_PER_PERIOD requires dueDay to be null',
        );
      }
      if (dto.oneTimeDueDate)
        throw new BadRequestException('RECURRING cannot define oneTimeDueDate');
      if (
        isRent &&
        (dto.recurrenceMonths !== 1 || dueMode !== RentalDueMode.FIXED_DAY)
      ) {
        throw new BadRequestException('RENT must be monthly and use FIXED_DAY');
      }
      if (
        isRent &&
        contract.status === RentalContractStatus.ACTIVE &&
        (dto.amountMode !== RentalAmountMode.FIXED ||
          !dto.defaultAmount ||
          (!dto.adjustmentIntervalMonths &&
            !allowLegacyActiveAdjustmentPending))
      ) {
        throw new BadRequestException(
          'ACTIVE RENT requires fixed amount and adjustmentIntervalMonths',
        );
      }
      return {
        startsOn,
        endsOn,
        recurrenceMonths: dto.recurrenceMonths,
        dueMode,
        dueDay:
          dueMode === RentalDueMode.MANUAL_PER_PERIOD ? null : dto.dueDay!,
        oneTimeDueDate: null,
      };
    }
    if (
      dto.recurrenceMonths != null ||
      dto.dueDay != null ||
      dueMode !== RentalDueMode.FIXED_DAY ||
      (requireOneTimeDate && !dto.oneTimeDueDate)
    ) {
      throw new BadRequestException(
        'ONE_TIME requires oneTimeDueDate and no recurrence fields',
      );
    }
    if (!dto.oneTimeDueDate) {
      return {
        startsOn,
        endsOn,
        recurrenceMonths: null,
        dueMode: RentalDueMode.FIXED_DAY,
        dueDay: null,
        oneTimeDueDate: null,
      };
    }
    const oneTimeDueDate = this.parseDate(dto.oneTimeDueDate, 'oneTimeDueDate');
    if (
      oneTimeDueDate < startsOn ||
      (endsOn && oneTimeDueDate > endsOn) ||
      oneTimeDueDate < contract.startsOn ||
      (contract.endsOn && oneTimeDueDate > contract.endsOn)
    ) {
      throw new BadRequestException(
        'oneTimeDueDate must be inside obligation and contract dates',
      );
    }
    return {
      startsOn,
      endsOn,
      recurrenceMonths: null,
      dueMode: RentalDueMode.FIXED_DAY,
      dueDay: null,
      oneTimeDueDate,
    };
  }

  private requireObligation(id: string, tenantId: string) {
    return this.repository.findById(id, tenantId).then((value) => {
      if (!value) throw new NotFoundException('Rental obligation not found');
      return value;
    });
  }

  private async occurrenceResponseForTenant(
    item: RentalOccurrenceRecord,
    tenantId: string,
  ) {
    const timeZone = await this.repository.tenantTimeZone(tenantId);
    return this.toOccurrenceResponse(
      item,
      localDateForTimeZone(new Date(), timeZone),
    );
  }

  private toObligationResponse(item: RentalObligationRecord) {
    const nextDate = nextAdjustmentDate(
      item.rentValueRevisions,
      item.adjustmentIntervalMonths,
    );
    return {
      ...item,
      defaultAmount:
        item.defaultAmount == null ? null : Number(item.defaultAmount),
      rentValueRevisions: item.rentValueRevisions.map((revision) => ({
        ...revision,
        amount: Number(revision.amount),
      })),
      nextAdjustmentDate: nextDate ? formatDateOnly(nextDate) : null,
      adjustmentConfigurationPending:
        item.concept.systemCode === 'RENT' &&
        item.adjustmentIntervalMonths == null,
    };
  }

  private toOccurrenceResponse(item: RentalOccurrenceRecord, today: Date) {
    const currentFulfillment =
      item.fulfillments.find(
        (fulfillment) => fulfillment.status === 'RECORDED',
      ) ?? null;
    return {
      ...item,
      amount: item.amount == null ? null : Number(item.amount),
      dueDatePending: item.dueDate == null,
      operationalStatus:
        item.status === RentalOccurrenceStatus.PENDING &&
        item.dueDate != null &&
        item.dueDate < today
          ? 'OVERDUE'
          : item.status,
      fulfillments: item.fulfillments.map((fulfillment) =>
        this.toFulfillmentResponse(fulfillment),
      ),
      fulfillmentSummary: currentFulfillment
        ? {
            id: currentFulfillment.id,
            status: currentFulfillment.status,
            fulfilledOn: currentFulfillment.fulfilledOn,
            amount:
              currentFulfillment.amount == null
                ? null
                : Number(currentFulfillment.amount),
            actorId: currentFulfillment.recordedById,
            notes: currentFulfillment.notes,
          }
        : null,
      actions: {
        canSetDueDate:
          item.status === RentalOccurrenceStatus.PENDING &&
          item.obligation.dueMode === RentalDueMode.MANUAL_PER_PERIOD,
        canSetAmount: item.status === RentalOccurrenceStatus.PENDING,
        canFulfill: item.status === RentalOccurrenceStatus.PENDING,
        canCancel: item.status === RentalOccurrenceStatus.PENDING,
        canReverseFulfillment: currentFulfillment != null,
      },
    };
  }

  private toFulfillmentResponse(item: {
    amount: Prisma.Decimal | null;
    [key: string]: unknown;
  }) {
    return {
      ...item,
      amount: item.amount == null ? null : Number(item.amount),
    };
  }

  private parseDate(value: string, field: string) {
    try {
      return parseDateOnly(value);
    } catch {
      throw new BadRequestException(`${field} must be a valid date`);
    }
  }

  private normalizeText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private isTerminal(status: RentalContractStatus) {
    return (
      status === RentalContractStatus.ENDED ||
      status === RentalContractStatus.CANCELLED
    );
  }
}
