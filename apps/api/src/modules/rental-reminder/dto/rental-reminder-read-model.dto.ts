import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
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
}
