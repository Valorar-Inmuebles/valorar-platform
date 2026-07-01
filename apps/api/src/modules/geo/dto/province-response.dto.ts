import { ApiProperty } from '@nestjs/swagger';
import { Province } from '../../../../generated/prisma/client';

export class ProvinceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ nullable: true })
  isoCode: string | null;

  static fromEntity(province: Province): ProvinceResponseDto {
    return {
      id: province.id,
      name: province.name,
      slug: province.slug,
      isoCode: province.isoCode,
    };
  }
}
