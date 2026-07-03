import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DevelopmentTypologyModule } from '../development-typology/development-typology.module';
import { PropertyFeatureModule } from '../property-feature/property-feature.module';
import { DevelopmentTypologyFeatureAssignmentController } from './controllers/development-typology-feature-assignment.controller';
import { DevelopmentTypologyFeatureAssignmentRepository } from './repositories/development-typology-feature-assignment.repository';
import { DevelopmentTypologyFeatureAssignmentService } from './services/development-typology-feature-assignment.service';

@Module({
  imports: [AuthModule, DevelopmentTypologyModule, PropertyFeatureModule],
  controllers: [DevelopmentTypologyFeatureAssignmentController],
  providers: [
    DevelopmentTypologyFeatureAssignmentService,
    DevelopmentTypologyFeatureAssignmentRepository,
  ],
  exports: [
    DevelopmentTypologyFeatureAssignmentService,
    DevelopmentTypologyFeatureAssignmentRepository,
  ],
})
export class DevelopmentTypologyFeatureAssignmentModule {}
