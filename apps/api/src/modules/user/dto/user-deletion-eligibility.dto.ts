import { ApiProperty } from '@nestjs/swagger';
import type {
  UserDeletionEligibility,
  UserDeletionReason,
  UserDeletionReasonCode,
  UserDeletionSideEffects,
} from '../utils/user-deletion.eligibility';

export class UserDeletionReasonDto implements UserDeletionReason {
  @ApiProperty({
    enum: [
      'HAS_CREATED_PROPERTIES',
      'HAS_CREATED_DEVELOPMENTS',
      'SELF_DELETE',
      'LAST_ACTIVE_TENANT_ADMIN',
      'SUPER_ADMIN_FORBIDDEN',
    ],
  })
  code!: UserDeletionReasonCode;

  @ApiProperty()
  message!: string;

  @ApiProperty({ required: false })
  count?: number;
}

export class UserDeletionSideEffectsDto implements UserDeletionSideEffects {
  @ApiProperty()
  assignedPropertiesToClear!: number;

  @ApiProperty()
  agentAccessRowsToDelete!: number;

  @ApiProperty()
  grantedByRowsToNull!: number;
}

export class UserDeletionEligibilityDto implements UserDeletionEligibility {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  canDelete!: boolean;

  @ApiProperty({ type: [UserDeletionReasonDto] })
  reasons!: UserDeletionReasonDto[];

  @ApiProperty({ type: UserDeletionSideEffectsDto })
  sideEffectsIfDeleted!: UserDeletionSideEffectsDto;
}
