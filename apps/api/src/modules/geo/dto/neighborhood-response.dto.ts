import { ApiProperty } from '@nestjs/swagger';
import { Neighborhood } from '../../../../generated/prisma/client';

export class NeighborhoodResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  localityId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  static fromEntity(neighborhood: Neighborhood): NeighborhoodResponseDto {
    return {
      id: neighborhood.id,
      localityId: neighborhood.localityId,
      name: neighborhood.name,
      slug: neighborhood.slug,
    };
  }
}
