import { ApiProperty } from '@nestjs/swagger';
import { PlatformTenantResponseDto } from './platform-tenant-response.dto';
import { PlatformTenantStatsDto } from './platform-tenant-stats.dto';

export class PlatformTenantListResponseDto {
  @ApiProperty({ type: PlatformTenantStatsDto })
  stats!: PlatformTenantStatsDto;

  @ApiProperty({ type: PlatformTenantResponseDto, isArray: true })
  items!: PlatformTenantResponseDto[];
}
