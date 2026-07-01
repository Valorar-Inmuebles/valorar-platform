import { ApiProperty } from '@nestjs/swagger';

export class PlatformTenantStatsDto {
  @ApiProperty()
  activeTenants!: number;

  @ApiProperty()
  suspendedTenants!: number;

  @ApiProperty()
  totalUsers!: number;

  @ApiProperty()
  totalProperties!: number;
}
