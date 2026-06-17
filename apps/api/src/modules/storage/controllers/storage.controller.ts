import { Body, Controller, Post, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { RequireTenant } from '../../../common/decorators/require-tenant.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { CreateStorageUploadUrlDto } from '../dto/create-storage-upload-url.dto';
import { StorageUploadUrlResponseDto } from '../dto/storage-upload-url-response.dto';
import { isStorageConfigured } from '../storage.config';
import { S3CompatibleStorageService } from '../services/s3-compatible-storage.service';
import { buildGenericUploadStorageKey } from '../utils/storage-key.util';

@ApiTags('Storage')
@UseGuards(JwtAuthGuard, TenantGuard)
@RequireTenant()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: S3CompatibleStorageService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Create a signed upload URL for generic tenant storage' })
  @ApiCreatedResponse({
    description: 'Signed upload URL generated',
    type: StorageUploadUrlResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error or unsupported mime type' })
  @ApiServiceUnavailableResponse({ description: 'Storage not configured' })
  async createUploadUrl(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateStorageUploadUrlDto,
  ): Promise<StorageUploadUrlResponseDto> {
    this.assertStorageAvailable();

    const storageKey = buildGenericUploadStorageKey(
      tenantId,
      dto.mimeType,
      dto.filename,
    );

    return this.storageService.getSignedUploadUrl(storageKey, dto.mimeType);
  }

  private assertStorageAvailable(): void {
    if (!isStorageConfigured()) {
      throw new ServiceUnavailableException(
        'Storage is not configured on this server.',
      );
    }
  }
}
