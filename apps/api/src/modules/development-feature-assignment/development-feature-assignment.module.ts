import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DevelopmentModule } from '../development/development.module';
import { PropertyFeatureModule } from '../property-feature/property-feature.module';
import { DevelopmentFeatureAssignmentController } from './controllers/development-feature-assignment.controller';
import { DevelopmentFeatureAssignmentRepository } from './repositories/development-feature-assignment.repository';
import { DevelopmentFeatureAssignmentService } from './services/development-feature-assignment.service';

@Module({
  imports: [AuthModule, DevelopmentModule, PropertyFeatureModule],
  controllers: [DevelopmentFeatureAssignmentController],
  providers: [
    DevelopmentFeatureAssignmentService,
    DevelopmentFeatureAssignmentRepository,
  ],
  exports: [
    DevelopmentFeatureAssignmentService,
    DevelopmentFeatureAssignmentRepository,
  ],
})
export class DevelopmentFeatureAssignmentModule {}
