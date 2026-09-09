import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RentalContractStatus } from '../../../../generated/prisma/client';
import { CreateRentalContractDto } from '../dto/create-rental-contract.dto';
import { RentalContractResponseDto } from '../dto/rental-contract-response.dto';
import { UpdateRentalContractDto } from '../dto/update-rental-contract.dto';
import { RentalContractRepository } from '../repositories/rental-contract.repository';

@Injectable()
export class RentalContractService {
  constructor(private readonly repository: RentalContractRepository) {}

  async create(
    tenantId: string,
    createdById: string | null,
    dto: CreateRentalContractDto,
  ) {
    await this.assertReferences(tenantId, dto);
    const propertyAddressSnapshot = dto.propertyAddressSnapshot.trim();
    if (!propertyAddressSnapshot) {
      throw new BadRequestException('propertyAddressSnapshot is required');
    }
    const startsOn = this.parseDate(dto.startsOn, 'startsOn');
    const endsOn = this.parseOptionalDate(dto.endsOn, 'endsOn');
    this.assertDateRange(startsOn, endsOn);

    const contract = await this.repository.create({
      tenantId,
      createdById,
      propertyId: dto.propertyId ?? null,
      renterContactId: dto.renterContactId ?? null,
      landlordContactId: dto.landlordContactId ?? null,
      propertyAddressSnapshot,
      propertyLocalitySnapshot: this.normalizeOptionalText(
        dto.propertyLocalitySnapshot,
      ),
      propertyUnitSnapshot: this.normalizeOptionalText(
        dto.propertyUnitSnapshot,
      ),
      propertyNotesSnapshot: this.normalizeOptionalText(
        dto.propertyNotesSnapshot,
      ),
      startsOn,
      endsOn,
      status: RentalContractStatus.DRAFT,
      notes: this.normalizeOptionalText(dto.notes),
    });

    return RentalContractResponseDto.fromEntity(contract);
  }

  async findAll(tenantId: string, status?: RentalContractStatus) {
    const contracts = await this.repository.findMany(tenantId, status);
    return contracts.map((contract) =>
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
    ) {
      throw new ConflictException('Terminal rental contracts cannot be edited');
    }

    await this.assertReferences(tenantId, dto);
    if (existing.status === RentalContractStatus.ACTIVE) {
      const renterContactId =
        dto.renterContactId !== undefined
          ? dto.renterContactId
          : existing.renterContactId;
      if (!renterContactId) {
        throw new BadRequestException(
          'renterContactId is required for an active rental contract',
        );
      }
      await this.assertContact(renterContactId, tenantId, 'renterContactId');
    }
    const propertyAddressSnapshot = dto.propertyAddressSnapshot?.trim();
    if (dto.propertyAddressSnapshot !== undefined && !propertyAddressSnapshot) {
      throw new BadRequestException('propertyAddressSnapshot is required');
    }
    const startsOn = dto.startsOn
      ? this.parseDate(dto.startsOn, 'startsOn')
      : existing.startsOn;
    const endsOn =
      dto.endsOn !== undefined
        ? this.parseOptionalDate(dto.endsOn, 'endsOn')
        : existing.endsOn;
    this.assertDateRange(startsOn, endsOn);

    const updated = await this.repository.update(id, tenantId, {
      ...(dto.propertyId !== undefined ? { propertyId: dto.propertyId } : {}),
      ...(dto.renterContactId !== undefined
        ? { renterContactId: dto.renterContactId }
        : {}),
      ...(dto.landlordContactId !== undefined
        ? { landlordContactId: dto.landlordContactId }
        : {}),
      ...(dto.propertyAddressSnapshot !== undefined
        ? { propertyAddressSnapshot }
        : {}),
      ...(dto.propertyLocalitySnapshot !== undefined
        ? {
            propertyLocalitySnapshot: this.normalizeOptionalText(
              dto.propertyLocalitySnapshot,
            ),
          }
        : {}),
      ...(dto.propertyUnitSnapshot !== undefined
        ? {
            propertyUnitSnapshot: this.normalizeOptionalText(
              dto.propertyUnitSnapshot,
            ),
          }
        : {}),
      ...(dto.propertyNotesSnapshot !== undefined
        ? {
            propertyNotesSnapshot: this.normalizeOptionalText(
              dto.propertyNotesSnapshot,
            ),
          }
        : {}),
      ...(dto.startsOn !== undefined ? { startsOn } : {}),
      ...(dto.endsOn !== undefined ? { endsOn } : {}),
      ...(dto.notes !== undefined
        ? { notes: this.normalizeOptionalText(dto.notes) }
        : {}),
    });

    if (!updated) {
      throw new NotFoundException(`Rental contract with id "${id}" not found`);
    }
    return RentalContractResponseDto.fromEntity(updated);
  }

  activate(id: string, tenantId: string) {
    return this.transition(id, tenantId, RentalContractStatus.ACTIVE);
  }

  end(id: string, tenantId: string) {
    return this.transition(id, tenantId, RentalContractStatus.ENDED);
  }

  cancel(id: string, tenantId: string) {
    return this.transition(id, tenantId, RentalContractStatus.CANCELLED);
  }

  private async transition(
    id: string,
    tenantId: string,
    target: RentalContractStatus,
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

    if (!allowed) {
      throw new ConflictException(
        `Rental contract cannot transition from ${existing.status} to ${target}`,
      );
    }

    if (target === RentalContractStatus.ACTIVE) {
      if (!existing.renterContactId) {
        throw new BadRequestException(
          'renterContactId is required to activate a rental contract',
        );
      }
      await this.assertContact(
        existing.renterContactId,
        tenantId,
        'renterContactId',
      );
      if (existing.landlordContactId) {
        await this.assertContact(
          existing.landlordContactId,
          tenantId,
          'landlordContactId',
        );
      }
      if (existing.propertyId) {
        await this.assertProperty(existing.propertyId, tenantId);
      }
      // RentalObligation enters in Migration B. ACTIVE requiring RENT is
      // intentionally enforced there, without a temporary duplicate field.
    }

    const updated = await this.repository.update(id, tenantId, {
      status: target,
    });
    if (!updated) {
      throw new NotFoundException(`Rental contract with id "${id}" not found`);
    }
    return RentalContractResponseDto.fromEntity(updated);
  }

  private async requireContract(id: string, tenantId: string) {
    const contract = await this.repository.findById(id, tenantId);
    if (!contract) {
      throw new NotFoundException(`Rental contract with id "${id}" not found`);
    }
    return contract;
  }

  private async assertReferences(
    tenantId: string,
    dto: Partial<CreateRentalContractDto>,
  ): Promise<void> {
    if (dto.propertyId) await this.assertProperty(dto.propertyId, tenantId);
    if (dto.renterContactId) {
      await this.assertContact(
        dto.renterContactId,
        tenantId,
        'renterContactId',
      );
    }
    if (dto.landlordContactId) {
      await this.assertContact(
        dto.landlordContactId,
        tenantId,
        'landlordContactId',
      );
    }
  }

  private async assertProperty(propertyId: string, tenantId: string) {
    if (
      !(await this.repository.propertyBelongsToTenant(propertyId, tenantId))
    ) {
      throw new BadRequestException(
        'propertyId must reference an active property in the same tenant',
      );
    }
  }

  private async assertContact(
    contactId: string,
    tenantId: string,
    field: string,
  ) {
    if (!(await this.repository.contactBelongsToTenant(contactId, tenantId))) {
      throw new BadRequestException(
        `${field} must reference an active contact in the same tenant`,
      );
    }
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return date;
  }

  private parseOptionalDate(
    value: string | null | undefined,
    field: string,
  ): Date | null {
    return value ? this.parseDate(value, field) : null;
  }

  private assertDateRange(startsOn: Date, endsOn: Date | null): void {
    if (endsOn && endsOn < startsOn) {
      throw new BadRequestException('endsOn must not be before startsOn');
    }
  }

  private normalizeOptionalText(
    value: string | null | undefined,
  ): string | null {
    if (value == null) return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
