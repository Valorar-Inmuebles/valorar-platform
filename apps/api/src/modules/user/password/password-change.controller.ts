import {
  Body,
  Controller,
  HttpCode,
  Patch,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PasswordChangeFilter } from './password-change.filter';
import { PasswordChangeGuard } from './password-change.guard';
import { PasswordChangeService } from './password-change.service';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    minLength: 12,
    description: 'Máximo 72 bytes UTF-8; no se normaliza.',
  })
  @IsString()
  newPassword!: string;
}

@ApiTags('Users')
@Controller('users/me/password')
@UseGuards(JwtAuthGuard, PasswordChangeGuard)
@UseFilters(PasswordChangeFilter)
export class PasswordChangeController {
  constructor(private readonly service: PasswordChangeService) {}

  @Patch()
  @HttpCode(204)
  @ApiNoContentResponse({
    description: 'Contraseña actualizada; JWT existentes conservados.',
  })
  change(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.service.change(user.id, dto.currentPassword, dto.newPassword);
  }
}
