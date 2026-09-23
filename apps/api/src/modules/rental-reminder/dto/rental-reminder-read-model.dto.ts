import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  NotificationChannel,
  RentalReminderDispatchStatus,
  RentalReminderEventType,
} from '../../../../generated/prisma/client';
import { RentalReminderPageQueryDto } from './rental-reminder.dto';

/** Sort server-side allowlist del historial global. */
export const HISTORY_SORTABLE_COLUMNS = [
  'scheduledFor',
  'internalNumber',
  'status',
  'eventType',
] as const;

export class RentalReminderContractHistoryQueryDto extends RentalReminderPageQueryDto {
  @ApiPropertyOptional({ enum: RentalReminderEventType })
  @IsOptional()
  @IsEnum(RentalReminderEventType)
  eventType?: RentalReminderEventType;

  @ApiPropertyOptional({ enum: RentalReminderDispatchStatus })
  @IsOptional()
  @IsEnum(RentalReminderDispatchStatus)
  dispatchStatus?: RentalReminderDispatchStatus;

  @ApiPropertyOptional({
    enum: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
    description:
      'When present, only dispatches with at least one delivery on this ' +
      'channel are returned, and only those deliveries are included.',
  })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;
}

/**
 * Query del historial global de avisos (C4C.1). Fila = dispatch; las ventanas
 * de delivery (`sent*`/`delivered*`/`failed*`) filtran filas con `deliveries:
 * { some }`: al menos un delivery del dispatch cae dentro de la ventana.
 * `scheduledTo` y las ventanas `*To` son bounds exclusivos.
 */
export class RentalReminderHistoryQueryDto extends RentalReminderPageQueryDto {
  @ApiPropertyOptional({
    maxLength: 120,
    description:
      'Contrato (internalNumber) o destinatario/contacto por nombre. ' +
      'Nunca teléfono ni email.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: RentalReminderEventType })
  @IsOptional()
  @IsEnum(RentalReminderEventType)
  eventType?: RentalReminderEventType;

  @ApiPropertyOptional({ enum: RentalReminderDispatchStatus })
  @IsOptional()
  @IsEnum(RentalReminderDispatchStatus)
  status?: RentalReminderDispatchStatus;

  @ApiPropertyOptional({
    enum: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
    description:
      'Only dispatches with at least one delivery on this channel are ' +
      'returned, and only those deliveries are included.',
  })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional({
    description: 'scheduledFor lower bound (inclusive). ISO-8601 UTC.',
  })
  @IsOptional()
  @IsDateString()
  scheduledFrom?: string;

  @ApiPropertyOptional({
    description: 'scheduledFor upper bound (exclusive). ISO-8601 UTC.',
  })
  @IsOptional()
  @IsDateString()
  scheduledTo?: string;

  @ApiPropertyOptional({
    description: 'Deliveries.sentAt lower bound (inclusive).',
  })
  @IsOptional()
  @IsDateString()
  sentFrom?: string;

  @ApiPropertyOptional({
    description: 'Deliveries.sentAt upper bound (exclusive).',
  })
  @IsOptional()
  @IsDateString()
  sentTo?: string;

  @ApiPropertyOptional({
    description: 'Deliveries.deliveredAt lower bound (inclusive).',
  })
  @IsOptional()
  @IsDateString()
  deliveredFrom?: string;

  @ApiPropertyOptional({
    description: 'Deliveries.deliveredAt upper bound (exclusive).',
  })
  @IsOptional()
  @IsDateString()
  deliveredTo?: string;

  @ApiPropertyOptional({
    description: 'Deliveries.failedAt lower bound (inclusive).',
  })
  @IsOptional()
  @IsDateString()
  failedFrom?: string;

  @ApiPropertyOptional({
    description: 'Deliveries.failedAt upper bound (exclusive).',
  })
  @IsOptional()
  @IsDateString()
  failedTo?: string;

  @ApiPropertyOptional({ enum: HISTORY_SORTABLE_COLUMNS })
  @IsOptional()
  @IsIn(HISTORY_SORTABLE_COLUMNS)
  sortBy?: (typeof HISTORY_SORTABLE_COLUMNS)[number];

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class RentalReminderInboundQueryDto extends RentalReminderPageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional({
    description:
      'Early bound of the received window (inclusive). ISO-8601 UTC.',
  })
  @IsOptional()
  @IsDateString()
  receivedFrom?: string;

  @ApiPropertyOptional({
    description: 'Late bound of the received window (exclusive). ISO-8601 UTC.',
  })
  @IsOptional()
  @IsDateString()
  receivedTo?: string;

  @ApiPropertyOptional({
    description:
      'When true, only messages not yet read in Admin (readAt IS NULL).',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value === 'true' || value === true) {
      return true;
    }
    if (value === 'false' || value === false) {
      return false;
    }
    return undefined;
  })
  @IsBoolean()
  unread?: boolean;

  @ApiPropertyOptional({
    description:
      'When true, only messages not yet acknowledged (acknowledgedAt IS NULL).',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value === 'true' || value === true) {
      return true;
    }
    if (value === 'false' || value === false) {
      return false;
    }
    return undefined;
  })
  @IsBoolean()
  unacknowledged?: boolean;
}
