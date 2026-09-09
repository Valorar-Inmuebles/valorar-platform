import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateRentalConceptDto {
  @ApiProperty({ example: 'Internet' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 120)
  name: string;

  @ApiProperty({ example: 'internet' })
  @IsString()
  @Length(2, 80)
  @Matches(SLUG_PATTERN)
  slug: string;
}
