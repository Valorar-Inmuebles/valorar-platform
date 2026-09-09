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
  RentalObligationKind,
  RentalOccurrenceStatus,
} from '../../../../generated/prisma/client';
import { CreateRentalObligationDto } from '../dto/create-rental-obligation.dto';
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

    const normalized = this.validateConfiguration(dto, contract);
    if (
      concept.systemCode === 'RENT' &&
      (dto.isActive ?? true) &&
      (await this.repository.countActiveRent(dto.contractId, tenantId)) > 0
    ) {
      throw new ConflictException(
        'The contract already has an active RENT obligation',
      );
    }

    const obligation = await this.repository.create({
      tenantId,
      contractId: dto.contractId,
      conceptId: dto.conceptId,
      kind: dto.kind,
      recurrenceMonths: normalized.recurrenceMonths,
      dueDay: normalized.dueDay,
      amountMode: dto.amountMode,
      defaultAmount: dto.defaultAmount ?? null,
      currency: dto.currency,
      startsOn: normalized.startsOn,
      endsOn: normalized.endsOn,
      isActive: dto.isActive ?? true,
    });
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
      dueDay: dto.dueDay !== undefined ? dto.dueDay : existing.dueDay,
      amountMode: dto.amountMode ?? existing.amountMode,
      defaultAmount:
        dto.defaultAmount !== undefined
          ? dto.defaultAmount
          : existing.defaultAmount
            ? Number(existing.defaultAmount)
            : null,
      currency: dto.currency ?? existing.currency,
      startsOn: dto.startsOn ?? formatDateOnly(existing.startsOn),
      endsOn:
        dto.endsOn !== undefined
          ? dto.endsOn
          : existing.endsOn
            ? formatDateOnly(existing.endsOn)
            : null,
      isActive: dto.isActive ?? existing.isActive,
    } satisfies CreateRentalObligationDto;
    const normalized = this.validateConfiguration(
      effective,
      existing.contract,
      false,
    );

    const wasRent = existing.concept.systemCode === 'RENT';
    const remainsActiveRent =
      concept.systemCode === 'RENT' && effective.isActive;
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

    const updated = await this.repository.update(id, tenantId, {
      ...(dto.conceptId !== undefined ? { conceptId } : {}),
      ...(dto.recurrenceMonths !== undefined
        ? { recurrenceMonths: normalized.recurrenceMonths }
        : {}),
      ...(dto.dueDay !== undefined ? { dueDay: normalized.dueDay } : {}),
      ...(dto.amountMode !== undefined ? { amountMode: dto.amountMode } : {}),
      ...(dto.defaultAmount !== undefined
        ? { defaultAmount: dto.defaultAmount }
        : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.startsOn !== undefined ? { startsOn: normalized.startsOn } : {}),
      ...(dto.endsOn !== undefined ? { endsOn: normalized.endsOn } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
    if (!updated) throw new NotFoundException('Rental obligation not found');
    if (updated.isActive) await this.materializeRecord(updated, tenantId);
    return this.toObligationResponse(updated);
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
    const where: Prisma.RentalObligationOccurrenceWhereInput = {};
    const dueDateFilter: Prisma.DateTimeFilter = {};
    if (query.contractId) where.obligation = { contractId: query.contractId };
    if (query.status === 'OVERDUE') {
      where.status = RentalOccurrenceStatus.PENDING;
      dueDateFilter.lt = today;
    } else if (query.status === 'PENDING') {
      where.status = RentalOccurrenceStatus.PENDING;
      dueDateFilter.gte = today;
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
    if (upcomingOnly) {
      where.status = RentalOccurrenceStatus.PENDING;
      dueDateFilter.gte = today;
    }
    if (Object.keys(dueDateFilter).length) where.dueDate = dueDateFilter;
    return (
      await this.repository.findOccurrences(
        tenantId,
        where,
        upcomingOnly ? 20 : undefined,
      )
    ).map((item) => this.toOccurrenceResponse(item, today));
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
      dueDay: obligation.dueDay,
      oneTimeDueDate,
      obligationStartsOn: obligation.startsOn,
      obligationEndsOn: obligation.endsOn,
      contractStartsOn: obligation.contract.startsOn,
      contractEndsOn: obligation.contract.endsOn,
      localToday: localDateForTimeZone(new Date(), timeZone),
    }).map((seed) => ({
      ...seed,
      amount: obligation.defaultAmount,
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
    contract: { startsOn: Date; endsOn: Date | null },
    requireOneTimeDate = true,
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
    if (dto.kind === RentalObligationKind.RECURRING) {
      if (
        !dto.recurrenceMonths ||
        dto.recurrenceMonths < 1 ||
        !dto.dueDay ||
        dto.dueDay < 1 ||
        dto.dueDay > 31
      ) {
        throw new BadRequestException(
          'RECURRING requires recurrenceMonths >= 1 and dueDay 1-31',
        );
      }
      if (dto.oneTimeDueDate)
        throw new BadRequestException('RECURRING cannot define oneTimeDueDate');
      return {
        startsOn,
        endsOn,
        recurrenceMonths: dto.recurrenceMonths,
        dueDay: dto.dueDay,
        oneTimeDueDate: null,
      };
    }
    if (
      dto.recurrenceMonths != null ||
      dto.dueDay != null ||
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
    return {
      ...item,
      defaultAmount:
        item.defaultAmount == null ? null : Number(item.defaultAmount),
    };
  }

  private toOccurrenceResponse(item: RentalOccurrenceRecord, today: Date) {
    return {
      ...item,
      amount: item.amount == null ? null : Number(item.amount),
      operationalStatus:
        item.status === RentalOccurrenceStatus.PENDING && item.dueDate < today
          ? 'OVERDUE'
          : item.status,
      fulfillments: item.fulfillments.map((fulfillment) =>
        this.toFulfillmentResponse(fulfillment),
      ),
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
