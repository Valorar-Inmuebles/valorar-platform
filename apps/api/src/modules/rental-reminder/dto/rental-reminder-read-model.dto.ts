import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  NotificationChannel,
  RentalReminderDispatchStatus,
  RentalReminderEventType,
} from '../../../../generated/prisma/client';
import { RentalReminderPageQueryDto } from './rental-reminder.dto';

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
