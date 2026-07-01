import { ApiProperty } from '@nestjs/swagger';
import { Locality } from '../../../../generated/prisma/client';

export class LocalityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  provinceId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ nullable: true })
  postalCode: string | null;

  static fromEntity(locality: Locality): LocalityResponseDto {
    return {
      id: locality.id,
      provinceId: locality.provinceId,
      name: locality.name,
      slug: locality.slug,
      postalCode: locality.postalCode,
    };
  }
}
