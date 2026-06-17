import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PropertyPublishabilityQueryDto {
  @ApiProperty({
    description: 'Property listing id to evaluate publishability for',
    example: 'cmqhkqn3l0000mousq5tketcd',
  })
  @IsString()
  @IsNotEmpty()
  listingId!: string;
}
