import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlatformTenantController } from './controllers/platform-tenant.controller';
import { PlatformTenantRepository } from './repositories/platform-tenant.repository';
import { PlatformTenantService } from './services/platform-tenant.service';

@Module({
  imports: [AuthModule],
  controllers: [PlatformTenantController],
  providers: [PlatformTenantService, PlatformTenantRepository],
  exports: [PlatformTenantService, PlatformTenantRepository],
})
export class PlatformTenantModule {}
