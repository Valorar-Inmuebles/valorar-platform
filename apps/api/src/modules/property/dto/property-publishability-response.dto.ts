import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicationCheckDto {
  @ApiProperty({
    example: 'cover-image',
    enum: [
      'property-active',
      'has-image',
      'cover-image',
      'listing-active',
      'primary-price',
    ],
  })
  key!: string;

  @ApiProperty({ example: false })
  passed!: boolean;

  @ApiProperty({ example: 'Imagen portada definida' })
  label!: string;

  @ApiPropertyOptional({ example: 'Definí una imagen portada' })
  message?: string;
}

export class PropertyPublishabilityResponseDto {
  @ApiProperty({ example: false })
  isPublishable!: boolean;

  @ApiProperty({
    example: 60,
    description: 'Percentage of passed publication checks (0-100)',
  })
  progress!: number;

  @ApiProperty({ type: PublicationCheckDto, isArray: true })
  checks!: PublicationCheckDto[];

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['cover-image', 'primary-price'],
  })
  missing!: string[];

  static fromChecklistResult(result: {
    isPublishable: boolean;
    progress: number;
    checks: Array<{
      key: string;
      passed: boolean;
      label: string;
      message?: string;
    }>;
    missing: string[];
  }): PropertyPublishabilityResponseDto {
    const dto = new PropertyPublishabilityResponseDto();
    dto.isPublishable = result.isPublishable;
    dto.progress = result.progress;
    dto.checks = result.checks;
    dto.missing = result.missing;
    return dto;
  }
}
