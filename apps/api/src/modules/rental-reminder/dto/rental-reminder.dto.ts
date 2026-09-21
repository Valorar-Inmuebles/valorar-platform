import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  NotificationChannel,
  RentalReminderDeliveryStatus,
  RentalReminderDispatchStatus,
  RentalReminderEventType,
  RentalReminderPlanningIssueStatus,
  RentalReminderPlanningIssueType,
} from '../../../../generated/prisma/client';

export class UpdateRentalReminderPolicyDto {
  @ApiProperty()
  @IsBoolean()
  preDueEnabled!: boolean;

  @ApiProperty({ minimum: 1, maximum: 30 })
  @IsInt()
  @Min(1)
  @Max(30)
  preDueDays!: number;

  @ApiProperty()
  @IsBoolean()
  dueEnabled!: boolean;

  @ApiProperty()
  @IsBoolean()
  postDueEnabled!: boolean;

  @ApiProperty({ minimum: 1, maximum: 30 })
  @IsInt()
  @Min(1)
  @Max(30)
  postDueDays!: number;

  @ApiProperty({ minimum: 0, maximum: 1439 })
  @IsInt()
  @Min(0)
  @Max(1439)
  sendTimeMinutes!: number;
}

export class RentalReminderPageQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class RentalReminderPlanningIssueQueryDto extends RentalReminderPageQueryDto {
  @ApiPropertyOptional({ enum: RentalReminderPlanningIssueStatus })
  @IsOptional()
  @IsEnum(RentalReminderPlanningIssueStatus)
  status?: RentalReminderPlanningIssueStatus;

  @ApiPropertyOptional({ enum: RentalReminderPlanningIssueType })
  @IsOptional()
  @IsEnum(RentalReminderPlanningIssueType)
  type?: RentalReminderPlanningIssueType;

  @ApiPropertyOptional({ enum: NotificationChannel })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractId?: string;
}

export class RentalReminderDispatchQueryDto extends RentalReminderPageQueryDto {
  @ApiPropertyOptional({ enum: RentalReminderDispatchStatus })
  @IsOptional()
  @IsEnum(RentalReminderDispatchStatus)
  status?: RentalReminderDispatchStatus;

  @ApiPropertyOptional({ enum: RentalReminderEventType })
  @IsOptional()
  @IsEnum(RentalReminderEventType)
  eventType?: RentalReminderEventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractId?: string;
}

export class RentalReminderDeliveryQueryDto extends RentalReminderPageQueryDto {
  @ApiPropertyOptional({ enum: RentalReminderDeliveryStatus })
  @IsOptional()
  @IsEnum(RentalReminderDeliveryStatus)
  status?: RentalReminderDeliveryStatus;

  @ApiPropertyOptional({
    enum: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
  })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dispatchId?: string;
}
