import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequireTenant } from '../../../common/decorators/require-tenant.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserService } from '../services/user.service';

@ApiTags('Users')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequireTenant()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermissions('user.read')
  @ApiOperation({ summary: 'List users for active tenant' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  listUsers(@CurrentTenant() tenantId: string) {
    return this.userService.listUsers(tenantId);
  }

  @Get('me/profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    if (!user.tenantId) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      };
    }

    return this.userService.getUser(user.id, user.tenantId);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(user.id, dto);
  }

  @Get(':id')
  @RequirePermissions('user.read')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiOkResponse({ type: UserResponseDto })
  getUser(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.userService.getUser(id, tenantId);
  }

  @Post()
  @RequirePermissions('user.create')
  @ApiOperation({ summary: 'Create tenant user' })
  @ApiCreatedResponse({ type: UserResponseDto })
  createUser(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ) {
    return this.userService.createUser(tenantId, dto, actor);
  }

  @Patch(':id')
  @RequirePermissions('user.update')
  @ApiOperation({ summary: 'Update tenant user' })
  @ApiOkResponse({ type: UserResponseDto })
  updateUser(
    @CurrentTenant() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, tenantId, dto, actor);
  }
}
