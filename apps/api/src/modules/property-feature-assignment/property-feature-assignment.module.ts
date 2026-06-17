import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PropertyFeatureModule } from '../property-feature/property-feature.module';
import { PropertyModule } from '../property/property.module';
import { PropertyFeatureAssignmentController } from './controllers/property-feature-assignment.controller';
import { PropertyFeatureAssignmentRepository } from './repositories/property-feature-assignment.repository';
import { PropertyFeatureAssignmentService } from './services/property-feature-assignment.service';

@Module({
  imports: [AuthModule, PropertyModule, PropertyFeatureModule],
  controllers: [PropertyFeatureAssignmentController],
  providers: [
    PropertyFeatureAssignmentService,
    PropertyFeatureAssignmentRepository,
  ],
  exports: [
    PropertyFeatureAssignmentService,
    PropertyFeatureAssignmentRepository,
  ],
})
export class PropertyFeatureAssignmentModule {}
