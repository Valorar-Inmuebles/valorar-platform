import { ApiProperty } from '@nestjs/swagger';

export class StorageUploadUrlResponseDto {
  @ApiProperty()
  uploadUrl: string;

  @ApiProperty()
  storageKey: string;

  @ApiProperty()
  publicUrl: string;
}
